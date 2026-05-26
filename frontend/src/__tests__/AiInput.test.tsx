import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AiInput from '../components/ai/AiInput';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { post: vi.fn() },
}));

const mockedPost = vi.mocked(api.post);

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AiInput />
    </MemoryRouter>
  );
}

describe('AiInput', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedPost.mockResolvedValue({ reply: 'Hello from TARS' });
  });

  function getInput() {
    return screen.getByRole('textbox', { name: /ask tars/i });
  }

  function getSendButton() {
    return screen.getByRole('button', { name: /send/i });
  }

  it('renders the input with the TARS placeholder and a hidden chat panel', () => {
    renderAt();

    expect(getInput()).toHaveAttribute('placeholder', 'How can TARS help you?');
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });

  it('disables the send button until text is entered', async () => {
    renderAt();

    expect(getSendButton()).toBeDisabled();

    await userEvent.type(getInput(), 'Hello');
    expect(getSendButton()).toBeEnabled();
  });

  it('opens the chat, posts to /chat, renders the reply, and clears the input', async () => {
    renderAt();

    await userEvent.type(getInput(), 'What courses do I have?');
    await userEvent.click(getSendButton());

    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('What courses do I have?')).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith('/chat', {
      message: 'What courses do I have?',
      threadId: expect.any(String),
      pageContext: 'The user is on the StudyPilot home page.',
    });
    expect(await screen.findByText('Hello from TARS')).toBeInTheDocument();
    expect(getInput()).toHaveValue('');
  });

  it('renders the used-tools disclosure from the response', async () => {
    mockedPost.mockResolvedValueOnce({ reply: 'You have 2 courses.', tools: ['list_courses'] });
    renderAt();

    await userEvent.type(getInput(), 'My courses?{Enter}');

    expect(await screen.findByText('You have 2 courses.')).toBeInTheDocument();
    expect(screen.getByText('1 tool used')).toBeInTheDocument();
    expect(screen.getByText('list_courses')).toBeInTheDocument();
  });

  it('submits when pressing Enter in the input', async () => {
    renderAt();

    await userEvent.type(getInput(), 'Quick question{Enter}');

    expect(screen.getByText('Quick question')).toBeInTheDocument();
    expect(await screen.findByText('Hello from TARS')).toBeInTheDocument();
  });

  it('ignores whitespace-only submissions', async () => {
    renderAt();

    await userEvent.type(getInput(), '   {Enter}');

    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('shows an error message when the request fails', async () => {
    mockedPost.mockRejectedValueOnce(new Error('network down'));
    renderAt();

    await userEvent.type(getInput(), 'Hi{Enter}');

    expect(await screen.findByText(/something went wrong reaching tars/i)).toBeInTheDocument();
  });

  it('reuses the same thread id across turns within a session', async () => {
    renderAt();

    await userEvent.type(getInput(), 'First{Enter}');
    await screen.findByText('Hello from TARS');
    await userEvent.type(getInput(), 'Second{Enter}');
    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(2));

    const firstBody = mockedPost.mock.calls[0][1] as { threadId: string; pageContext?: string };
    const secondBody = mockedPost.mock.calls[1][1] as { threadId: string; pageContext?: string };
    expect(secondBody.threadId).toBe(firstBody.threadId);
    expect(firstBody.pageContext).toBeDefined();
    expect(secondBody.pageContext).toBeUndefined();
  });

  it('sends the course id in pageContext on a course detail route', async () => {
    renderAt('/courses/abc-123');

    await userEvent.type(getInput(), 'Hello{Enter}');
    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));

    const body = mockedPost.mock.calls[0][1] as { pageContext?: string };
    expect(body.pageContext).toBe('The user is on the course detail page for course id abc-123.');
  });

  it('clears the chat and starts a fresh thread when closed', async () => {
    renderAt();

    await userEvent.type(getInput(), 'First message{Enter}');
    await screen.findByText('Hello from TARS');
    const firstThread = (mockedPost.mock.calls[0][1] as { threadId: string }).threadId;

    await userEvent.click(screen.getByRole('button', { name: /close chat/i }));

    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(getInput()).toHaveFocus();

    await userEvent.type(getInput(), 'Second message{Enter}');
    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(2));

    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.queryByText('First message')).not.toBeInTheDocument();

    const secondThread = (mockedPost.mock.calls[1][1] as { threadId: string }).threadId;
    expect(secondThread).not.toBe(firstThread);
  });
});

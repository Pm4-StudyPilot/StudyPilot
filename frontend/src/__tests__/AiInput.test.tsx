import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiInput from '../components/ai/AiInput';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { post: vi.fn() },
}));

const mockedPost = vi.mocked(api.post);

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
    render(<AiInput />);

    expect(getInput()).toHaveAttribute('placeholder', 'How can TARS help you?');
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });

  it('disables the send button until text is entered', async () => {
    render(<AiInput />);

    expect(getSendButton()).toBeDisabled();

    await userEvent.type(getInput(), 'Hello');
    expect(getSendButton()).toBeEnabled();
  });

  it('opens the chat, posts to /chat, renders the reply, and clears the input', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), 'What courses do I have?');
    await userEvent.click(getSendButton());

    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('What courses do I have?')).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith('/chat', {
      message: 'What courses do I have?',
      threadId: expect.any(String),
    });
    expect(await screen.findByText('Hello from TARS')).toBeInTheDocument();
    expect(getInput()).toHaveValue('');
  });

  it('submits when pressing Enter in the input', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), 'Quick question{Enter}');

    expect(screen.getByText('Quick question')).toBeInTheDocument();
    expect(await screen.findByText('Hello from TARS')).toBeInTheDocument();
  });

  it('ignores whitespace-only submissions', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), '   {Enter}');

    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('shows an error message when the request fails', async () => {
    mockedPost.mockRejectedValueOnce(new Error('network down'));
    render(<AiInput />);

    await userEvent.type(getInput(), 'Hi{Enter}');

    expect(await screen.findByText(/something went wrong reaching tars/i)).toBeInTheDocument();
  });

  it('reuses the same thread id across turns within a session', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), 'First{Enter}');
    await screen.findByText('Hello from TARS');
    await userEvent.type(getInput(), 'Second{Enter}');
    await waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(2));

    const firstThread = mockedPost.mock.calls[0][1] as { threadId: string };
    const secondThread = mockedPost.mock.calls[1][1] as { threadId: string };
    expect(secondThread.threadId).toBe(firstThread.threadId);
  });

  it('clears the chat and starts a fresh thread when closed', async () => {
    render(<AiInput />);

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

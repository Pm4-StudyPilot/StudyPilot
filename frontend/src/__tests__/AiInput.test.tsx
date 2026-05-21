import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiInput from '../components/ai/AiInput';

describe('AiInput', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('opens the chat with the submitted message and clears the input', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), 'How do I study?');
    await userEvent.click(getSendButton());

    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByText('How do I study?')).toBeInTheDocument();
    expect(getInput()).toHaveValue('');
  });

  it('submits when pressing Enter in the input', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), 'Quick question{Enter}');

    expect(screen.getByText('Quick question')).toBeInTheDocument();
  });

  it('ignores whitespace-only submissions', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), '   {Enter}');

    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });

  it('keeps appending messages to the same conversation', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), 'First{Enter}');
    await userEvent.type(getInput(), 'Second{Enter}');

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('clears the chat and refocuses the input when closed, starting fresh on reopen', async () => {
    render(<AiInput />);

    await userEvent.type(getInput(), 'First message{Enter}');
    expect(screen.getByText('First message')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close chat/i }));

    // Panel is gone and the input regains focus.
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(getInput()).toHaveFocus();

    // Reopening starts a fresh conversation without the old message.
    await userEvent.type(getInput(), 'Second message{Enter}');
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.queryByText('First message')).not.toBeInTheDocument();
  });
});

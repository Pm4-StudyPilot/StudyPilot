import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiChatPanel from '../components/ai/AiChatPanel';
import { ChatMessage } from '../components/ai/types';

const messages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'Hello TARS' },
  { id: '2', role: 'assistant', content: 'Hi there' },
];

describe('AiChatPanel', () => {
  it('renders every message with its content', () => {
    render(<AiChatPanel messages={messages} onClose={vi.fn()} />);

    expect(screen.getByText('Hello TARS')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('applies a role-specific class to each message', () => {
    render(<AiChatPanel messages={messages} onClose={vi.fn()} />);

    expect(screen.getByText('Hello TARS')).toHaveClass('ai-input__message--user');
    expect(screen.getByText('Hi there')).toHaveClass('ai-input__message--assistant');
  });

  it('renders nothing in the message area when there are no messages', () => {
    render(<AiChatPanel messages={[]} onClose={vi.fn()} />);

    expect(screen.queryByText('Hello TARS')).not.toBeInTheDocument();
    // The close button is still available even with an empty conversation.
    expect(screen.getByRole('button', { name: /close chat/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<AiChatPanel messages={messages} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /close chat/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a typing indicator while loading', () => {
    render(<AiChatPanel messages={messages} loading onClose={vi.fn()} />);
    expect(screen.getByLabelText(/tars is typing/i)).toBeInTheDocument();
  });

  it('does not show the typing indicator when not loading', () => {
    render(<AiChatPanel messages={messages} onClose={vi.fn()} />);
    expect(screen.queryByLabelText(/tars is typing/i)).not.toBeInTheDocument();
  });
});

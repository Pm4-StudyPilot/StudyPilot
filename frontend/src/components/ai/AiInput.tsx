import { FormEvent, useRef, useState } from 'react';
import { MdSend } from 'react-icons/md';
import Icon from '../shared/Icon';
import AiChatPanel from './AiChatPanel';
import { ChatMessage } from './types';
import { api } from '../../services/api';

export default function AiInput() {
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // One thread per chat session — reset on close so a fresh chat starts fresh.
  const threadIdRef = useRef<string | null>(null);

  function appendMessage(role: ChatMessage['role'], content: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content }]);
  }

  function handleClose() {
    setIsOpen(false);
    setIsLoading(false);
    setMessages([]);
    threadIdRef.current = null;
    inputRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const message = value.trim();
    if (!message || isLoading) return;

    if (!threadIdRef.current) {
      threadIdRef.current = crypto.randomUUID();
    }

    appendMessage('user', message);
    setIsOpen(true);
    setValue('');
    setIsLoading(true);

    try {
      const { reply } = await api.post<{ reply: string }>('/chat', {
        message,
        threadId: threadIdRef.current,
      });
      appendMessage('assistant', reply);
    } catch {
      appendMessage('assistant', 'Sorry, something went wrong reaching TARS. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="ai-input">
      {isOpen && <AiChatPanel messages={messages} loading={isLoading} onClose={handleClose} />}
      <form className="ai-input__form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="ai-input__field"
          placeholder="How can TARS help you?"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Ask TARS"
        />
        <button
          type="submit"
          className="ai-input__send"
          disabled={!value.trim() || isLoading}
          aria-label="Send"
        >
          <Icon icon={MdSend} size={18} aria-label="Send" />
        </button>
      </form>
    </div>
  );
}

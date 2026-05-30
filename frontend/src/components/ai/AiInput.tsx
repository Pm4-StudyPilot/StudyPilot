import { FormEvent, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MdSend } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import Icon from '../shared/Icon';
import AiChatPanel from './AiChatPanel';
import { ChatMessage } from './types';
import { describeCurrentPage } from './pageContext';
import { api } from '../../services/api';

export default function AiInput() {
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadIdRef = useRef<string | null>(null);
  const { pathname } = useLocation();
  const { t } = useTranslation();

  function appendMessage(role: ChatMessage['role'], content: string, tools?: string[]) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, content, tools }]);
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

    const isFirstMessage = !threadIdRef.current;
    if (!threadIdRef.current) {
      threadIdRef.current = crypto.randomUUID();
    }

    appendMessage('user', message);
    setIsOpen(true);
    setValue('');
    setIsLoading(true);

    try {
      const { reply, tools } = await api.post<{ reply: string; tools: string[] }>('/chat', {
        message,
        threadId: threadIdRef.current,
        ...(isFirstMessage ? { pageContext: describeCurrentPage(pathname) ?? undefined } : {}),
      });
      appendMessage('assistant', reply, tools);
    } catch {
      appendMessage('assistant', t('ai.errorReply'));
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
          placeholder={t('ai.placeholder')}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={t('ai.ariaLabel')}
          data-testid="ai-input-field"
        />
        <button
          type="submit"
          className="ai-input__send"
          disabled={!value.trim() || isLoading}
          aria-label={t('ai.sendAria')}
          data-testid="ai-send-button"
        >
          <Icon icon={MdSend} size={18} aria-label={t('ai.sendAria')} />
        </button>
      </form>
    </div>
  );
}

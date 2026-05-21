import { FormEvent, useRef, useState } from 'react';
import { MdSend } from 'react-icons/md';
import Icon from '../shared/Icon';
import AiChatPanel from './AiChatPanel';
import { ChatMessage } from './types';

export default function AiInput() {
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setIsOpen(false);
    setMessages([]);
    inputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const message = value.trim();
    if (!message) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: message }]);
    setIsOpen(true);

    // TODO: send the prompt to the TARS AI backend and append its response.
    console.log('TARS prompt submitted:', message);
    setValue('');
  }

  return (
    <div className="ai-input">
      {isOpen && <AiChatPanel messages={messages} onClose={handleClose} />}
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
        <button type="submit" className="ai-input__send" disabled={!value.trim()} aria-label="Send">
          <Icon icon={MdSend} size={18} aria-label="Send" />
        </button>
      </form>
    </div>
  );
}

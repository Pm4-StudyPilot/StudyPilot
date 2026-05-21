import { MdClose } from 'react-icons/md';
import Icon from '../shared/Icon';
import { ChatMessage } from './types';

interface AiChatPanelProps {
  messages: ChatMessage[];
  loading?: boolean;
  onClose: () => void;
}

export default function AiChatPanel({ messages, loading = false, onClose }: AiChatPanelProps) {
  return (
    <div className="ai-input__panel" role="log" aria-label="Chat with TARS">
      <div className="ai-input__panel-header">
        <button type="button" className="ai-input__close" onClick={onClose} aria-label="Close chat">
          <Icon icon={MdClose} size={18} aria-label="Close chat" />
        </button>
      </div>
      <div className="ai-input__messages">
        {messages.map((message) => (
          <div key={message.id} className={`ai-input__message ai-input__message--${message.role}`}>
            {message.content}
          </div>
        ))}
        {loading && (
          <div
            className="ai-input__message ai-input__message--assistant ai-input__typing"
            aria-label="TARS is typing"
          >
            <span className="ai-input__typing-dot" />
            <span className="ai-input__typing-dot" />
            <span className="ai-input__typing-dot" />
          </div>
        )}
      </div>
    </div>
  );
}

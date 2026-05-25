import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import Icon from '../shared/Icon';
import { ChatMessage } from './types';

interface AiChatPanelProps {
  messages: ChatMessage[];
  loading?: boolean;
  onClose: () => void;
}

export default function AiChatPanel({ messages, loading = false, onClose }: AiChatPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="ai-input__panel" role="log" aria-label={t('ai.chatAria')}>
      <div className="ai-input__panel-header">
        <button
          type="button"
          className="ai-input__close"
          onClick={onClose}
          aria-label={t('ai.closeAria')}
        >
          <Icon icon={MdClose} size={18} aria-label={t('ai.closeAria')} />
        </button>
      </div>
      <div className="ai-input__messages">
        {messages.map((message) => (
          <div key={message.id} className={`ai-input__message ai-input__message--${message.role}`}>
            {message.role === 'assistant' ? (
              <div className="ai-input__markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            ) : (
              message.content
            )}
            {message.tools && message.tools.length > 0 && (
              <details className="ai-input__tools">
                <summary className="ai-input__tools-summary">
                  {t(message.tools.length === 1 ? 'ai.toolsUsed' : 'ai.toolsUsed_other', {
                    count: message.tools.length,
                  })}
                </summary>
                <ol className="ai-input__tools-list">
                  {message.tools.map((toolName, index) => (
                    <li key={`${toolName}-${index}`}>{toolName}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        ))}
        {loading && (
          <div
            className="ai-input__message ai-input__message--assistant ai-input__typing"
            aria-label={t('ai.typingAria')}
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

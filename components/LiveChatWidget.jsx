'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FAQ_RESPONSES = {
  'sea moss': {
    question: 'What is sea moss?',
    answer: 'Sea moss (Irish moss) is a type of red algae that grows along the Atlantic coastlines. It contains 92 of the 102 essential minerals our bodies need, including iodine, iron, calcium, and zinc. Our wildcrafted sea moss is harvested from pristine ocean waters and hand-crafted into premium gel products.',
  },
  'how to use': {
    question: 'How do I use sea moss gel?',
    answer: 'Take 1-2 tablespoons daily! You can add it to smoothies, teas, soups, or even use it as a face mask. Store in the refrigerator and use within 3-4 weeks. For best results, take it consistently as part of your daily wellness routine.',
  },
  'shipping': {
    question: 'What are shipping times?',
    answer: 'We ship orders within 1-2 business days. Standard shipping takes 3-5 business days, and express shipping takes 1-2 business days. Free shipping is available on orders over $60! You\'ll receive tracking information via email once your order ships.',
  },
  'refund': {
    question: 'Do you offer refunds?',
    answer: 'Yes! We offer a 30-day satisfaction guarantee. If you\'re not completely happy with your purchase, contact us for a full refund. Please note that due to the perishable nature of our products, items must be returned in their original sealed condition.',
  },
  'location': {
    question: 'Where are you located?',
    answer: 'Taste of Gratitude is based in the United States. We ship nationwide and are committed to providing premium wildcrafted sea moss products to our community. For local pickup options, please contact us directly!',
  },
};

const FAQ_BUTTONS = [
  { key: 'sea moss', label: 'What is sea moss?' },
  { key: 'how to use', label: 'How to use it?' },
  { key: 'shipping', label: 'Shipping times?' },
  { key: 'refund', label: 'Refund policy?' },
  { key: 'location', label: 'Your location?' },
];

function findResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('what is sea moss') || lowerMessage.includes('what\'s sea moss') || (lowerMessage.includes('sea moss') && lowerMessage.includes('what'))) {
    return FAQ_RESPONSES['sea moss'];
  }
  if (lowerMessage.includes('how') && (lowerMessage.includes('use') || lowerMessage.includes('take') || lowerMessage.includes('consume'))) {
    return FAQ_RESPONSES['how to use'];
  }
  if (lowerMessage.includes('ship') || lowerMessage.includes('deliver') || lowerMessage.includes('how long')) {
    return FAQ_RESPONSES['shipping'];
  }
  if (lowerMessage.includes('refund') || lowerMessage.includes('return') || lowerMessage.includes('money back') || lowerMessage.includes('guarantee')) {
    return FAQ_RESPONSES['refund'];
  }
  if (lowerMessage.includes('where') || lowerMessage.includes('location') || lowerMessage.includes('located') || lowerMessage.includes('address') || lowerMessage.includes('pickup')) {
    return FAQ_RESPONSES['location'];
  }
  
  return null;
}

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hi there! 👋 Welcome to Taste of Gratitude. I\'m here to help answer your questions about our sea moss products. Choose a topic below or type your question!',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const addBotResponse = (response) => {
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          text: response,
        },
      ]);
    }, 500);
  };

  const handleFAQClick = (key) => {
    const faq = FAQ_RESPONSES[key];
    if (!faq) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: 'user',
        text: faq.question,
      },
    ]);

    addBotResponse(faq.answer);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: 'user',
        text: userMessage,
      },
    ]);
    setInputValue('');

    const matchedResponse = findResponse(userMessage);
    if (matchedResponse) {
      addBotResponse(matchedResponse.answer);
    } else {
      addBotResponse(
        'Thanks for your question! For personalized assistance, please email us at support@tasteofgratitude.com or call us during business hours. In the meantime, feel free to browse our FAQ topics above!'
      );
    }
  };

  return (
    <>
      {/* Chat Toggle Button - positioned above the cart button */}
      <div className="fixed bottom-24 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 ${
            isOpen
              ? 'bg-gray-600 hover:bg-gray-700'
              : 'bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700'
          }`}
          size="icon"
          aria-label={isOpen ? 'Close chat' : 'Open chat support'}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-44 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] transform transition-all duration-300 ease-out ${
          isOpen
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-4 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Chat Support</h3>
                  <p className="text-xs text-emerald-100">We typically reply instantly</p>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-8 w-8"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[280px] bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'bot' && (
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-emerald-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                </div>
                {message.type === 'user' && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* FAQ Quick Buttons */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {FAQ_BUTTONS.map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => handleFAQClick(btn.key)}
                  className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-200"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-gray-200 bg-white"
          >
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-full border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-full bg-emerald-600 hover:bg-emerald-700"
                disabled={!inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

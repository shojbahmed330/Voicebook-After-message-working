
import React, { useState } from 'react';
import { AppView, VoiceState } from '../types';
import Icon from './Icon';
import VoiceCommandInput from './VoiceCommandInput';

interface MobileBottomNavProps {
  onNavigate: (viewName: 'feed' | 'reels' | 'friends' | 'messages' | 'menu') => void;
  friendRequestCount: number;
  activeView: AppView;
  voiceState: VoiceState;
  onMicClick: () => void;
  onSendCommand: (command: string) => void;
  commandInputValue: string;
  setCommandInputValue: (value: string) => void;
  ttsMessage: string;
}

const NavButton: React.FC<{
    iconName: React.ComponentProps<typeof Icon>['name'];
    solidIconName?: React.ComponentProps<typeof Icon>['name'];
    label: string;
    isActive: boolean;
    onClick: () => void;
    badgeCount?: number;
}> = ({ iconName, solidIconName, label, isActive, onClick, badgeCount = 0 }) => (
    <button onClick={onClick} className="flex-1 flex flex-col items-center gap-1 text-xs transition-colors relative">
        <div className={`w-8 h-8 flex items-center justify-center ${isActive ? 'text-lime-400' : 'text-slate-400'}`}>
            <Icon name={isActive && solidIconName ? solidIconName : iconName} className="w-7 h-7" />
        </div>
        <span className={`${isActive ? 'text-lime-400 font-semibold' : 'text-slate-400'}`}>{label}</span>
        {badgeCount > 0 && (
            <span className="absolute top-0 right-1/2 translate-x-3 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badgeCount}
            </span>
        )}
    </button>
);


const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onNavigate,
  friendRequestCount,
  activeView,
  voiceState,
  onMicClick,
  onSendCommand,
  commandInputValue,
  setCommandInputValue,
  ttsMessage
}) => {
  const [isVoiceInputOpen, setVoiceInputOpen] = useState(false);
  
  if (isVoiceInputOpen) {
      return (
          <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
              <VoiceCommandInput
                  onSendCommand={(cmd) => { onSendCommand(cmd); setVoiceInputOpen(false); }}
                  voiceState={voiceState}
                  onMicClick={onMicClick}
                  value={commandInputValue}
                  onValueChange={setCommandInputValue}
                  placeholder={ttsMessage}
              />
          </div>
      );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-900 border-t border-lime-500/20 flex items-center justify-around h-20 px-2">
        <NavButton iconName="home" solidIconName="home-solid" label="Home" isActive={activeView === AppView.FEED} onClick={() => onNavigate('feed')} />
        <NavButton iconName="film" label="Reels" isActive={activeView === AppView.REELS} onClick={() => onNavigate('reels')} />
        
        <button 
            onClick={() => setVoiceInputOpen(true)} 
            className="w-16 h-16 -mt-8 bg-lime-500 rounded-full flex items-center justify-center text-black shadow-lg shadow-lime-500/20"
            aria-label="Open Voice Command"
        >
            <Icon name="mic" className="w-8 h-8" />
        </button>

        <NavButton iconName="users" solidIconName="users-group-solid" label="Friends" isActive={activeView === AppView.FRIENDS} onClick={() => onNavigate('friends')} badgeCount={friendRequestCount} />
        <NavButton iconName="ellipsis-vertical" label="Menu" isActive={activeView === AppView.MOBILE_MENU} onClick={() => onNavigate('menu')} />
    </div>
  );
};

export default MobileBottomNav;

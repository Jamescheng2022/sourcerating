'use client';

import React from 'react';
import {
  IconBuilding,
  IconFolder,
  IconLock,
  IconMessageSquare,
  IconAlertCircle,
  IconSliders,
} from './icons';
import { Room, Project, Organization } from '@/types/domain';
import { cn } from '@/lib/utils';

interface NavigationRailProps {
  currentOrg: Organization;
  project: Project;
  rooms: Room[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentOrg,
  project,
  rooms,
  activeRoomId,
  onSelectRoom,
}) => {
  const totalNeedsYou = rooms.reduce((sum, r) => sum + r.needsYouCount, 0);

  return (
    <aside className="w-[230px] shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col justify-between select-none">
      {/* Top Section: Organization Switcher & Project */}
      <div className="flex flex-col">
        {/* Organization Switcher */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-100 font-semibold text-xs border border-slate-700 shadow-sm shrink-0">
              {currentOrg.code.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-100 truncate tracking-tight">
                {currentOrg.name}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {currentOrg.badge || 'Buyer Organization'}
              </div>
            </div>
          </div>
        </div>

        {/* Project Selector Header */}
        <div className="px-3.5 pt-3.5 pb-1.5">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <IconFolder className="w-3.5 h-3.5 text-slate-400" />
            <span>Active Project</span>
          </div>
          <div className="p-2 rounded-md bg-slate-800/60 border border-slate-700/60">
            <div className="text-xs font-medium text-slate-100 truncate">
              {project.name}
            </div>
            <div className="text-[10px] text-sky-400 font-mono mt-0.5 truncate">
              {project.code}
            </div>
          </div>
        </div>

        {/* Rooms Rail */}
        <div className="px-2 pt-2 pb-1">
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Project Rooms</span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
              {rooms.length}
            </span>
          </div>

          <div className="space-y-1">
            {rooms.map((room) => {
              const isActive = room.id === activeRoomId;
              const isInternal = room.type === 'internal';

              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={cn(
                    'w-full text-left px-2.5 py-2 rounded-md text-xs transition-all flex items-center justify-between group',
                    isActive
                      ? 'bg-slate-800 text-white font-medium border-l-2 border-sky-400 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isInternal ? (
                      <IconLock
                        className={cn(
                          'w-3.5 h-3.5 shrink-0',
                          isActive ? 'text-indigo-400' : 'text-slate-400'
                        )}
                      />
                    ) : (
                      <IconMessageSquare
                        className={cn(
                          'w-3.5 h-3.5 shrink-0',
                          isActive ? 'text-amber-400' : 'text-slate-400'
                        )}
                      />
                    )}
                    <span className="truncate">{room.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-1.5">
                    {room.needsYouCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {room.needsYouCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Needs You Queue Indicator */}
        <div className="px-3.5 py-2.5 mt-2 mx-2 rounded-md bg-slate-950/60 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-300">
              <IconAlertCircle className="w-3.5 h-3.5" />
              <span>Needs You</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
              {totalNeedsYou} actions
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">
            AI staged proposals & commercial specs pending human confirmation.
          </div>
        </div>
      </div>

      {/* Bottom Section: Replaceable Decision Gateway & Settings */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2.5">
        {/* User Profile & Settings */}
        <div className="flex items-center justify-between pt-1 text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-slate-700 text-[10px] font-bold text-slate-200 flex items-center justify-center shrink-0">
              TC
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-200 font-medium truncate leading-tight">
                Tanawat Chen
              </div>
              <div className="text-[9px] text-slate-400 truncate leading-tight">
                Project Director
              </div>
            </div>
          </div>
          <button
            title="Settings"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <IconSliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
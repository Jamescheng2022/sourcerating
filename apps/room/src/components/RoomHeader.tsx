'use client';

import React from 'react';
import { Room, Project } from '@/types/domain';
import {
  IconLock,
  IconShield,
  IconBuilding,
  IconMenu,
  IconSliders,
  IconChevronRight,
  IconLayers,
  IconAlertCircle,
} from './icons';
import { cn } from '@/lib/utils';

interface RoomHeaderProps {
  project: Project;
  room: Room;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  onOpenMobileRooms: () => void;
  onOpenMobileState: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  project,
  room,
  isDrawerOpen,
  onToggleDrawer,
  onOpenMobileRooms,
  onOpenMobileState,
}) => {
  const isInternal = room.type === 'internal';

  return (
    <header className="shrink-0 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10">
      {/* Top Bar: Project metadata & actions */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Mobile Left Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onOpenMobileRooms}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 focus:outline-none"
            aria-label="Open rooms menu"
          >
            <IconMenu className="w-5 h-5" />
          </button>
        </div>

        {/* Center/Left: Project & Room Title */}
        <div className="min-w-0 flex-1 flex flex-col md:flex-row md:items-center md:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="truncate max-w-[140px] md:max-w-none">{project.name}</span>
            <IconChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
              {isInternal ? (
                <IconLock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              ) : (
                <IconBuilding className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              {room.name}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 mt-0.5 md:mt-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
              {project.phase}
            </span>
          </div>
        </div>

        {/* Right: Participants preview & State Drawer Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Participants Badges (Desktop) */}
          <div className="hidden lg:flex items-center -space-x-1.5 mr-2">
            <div
              title="Apex Living Modular (Buyer Lead)"
              className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white"
            >
              AL
            </div>
            {!isInternal && (
              <div
                title="EastFrame Steel Co., Ltd. (Supplier Counterparty)"
                className="w-6 h-6 rounded-full bg-amber-600 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white"
              >
                EF
              </div>
            )}
            <div
              title="SourceRating AI Staging Engine"
              className="w-6 h-6 rounded-full bg-sky-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
            >
              AI
            </div>
          </div>

          {/* Mobile State Button */}
          <button
            onClick={onOpenMobileState}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200"
          >
            <IconLayers className="w-3.5 h-3.5 text-slate-700" />
            <span>State</span>
            {room.needsYouCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {/* Desktop Project State Drawer Toggle */}
          <button
            onClick={onToggleDrawer}
            className={cn(
              'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border shadow-xs',
              isDrawerOpen
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            )}
          >
            <IconLayers className="w-3.5 h-3.5" />
            <span>Project State</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded text-[10px] font-semibold',
                isDrawerOpen
                  ? 'bg-slate-800 text-sky-300'
                  : 'bg-slate-100 text-slate-600'
              )}
            >
              360px
            </span>
          </button>
        </div>
      </div>

      {/* Visibly Distinct Room Boundary Banner */}
      <div
        className={cn(
          'px-4 py-2 text-xs flex items-center justify-between border-t transition-colors',
          isInternal
            ? 'bg-indigo-50/70 border-indigo-100 text-indigo-950'
            : 'bg-amber-50/90 border-amber-200 text-amber-950'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isInternal ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-200 text-indigo-900 uppercase tracking-wide shrink-0">
              <IconLock className="w-3 h-3" />
              Internal Only
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 uppercase tracking-wide shrink-0">
              <IconShield className="w-3 h-3" />
              External Counterparty
            </span>
          )}

          <p className="text-[11px] truncate leading-tight font-medium">
            {room.boundary.confidentialityNotice}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[10px] shrink-0 font-medium opacity-80">
          <span>Boundary: {room.boundary.label}</span>
        </div>
      </div>
    </header>
  );
};
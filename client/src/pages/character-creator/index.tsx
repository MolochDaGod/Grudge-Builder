/**
 * Character Creator - 6-Step Multi-Stage Form
 *
 * Flow:
 * Step 1: Race Selection
 * Step 2: Class Selection
 * Step 3: Stat Allocation
 * Step 4: Avatar Customization & cNFT Mint
 * Step 5: Island Intro Preview
 * Step 6: Island Generation & Reroll
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { characterAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';

import Step1Race from './step-1-race';
import Step2Class from './step-2-class';
import Step3Stats from './step-3-stats';
import Step4Avatar from './step-4-avatar';
import Step5IslandIntro from './step-5-island-intro';
import Step6IslandGen from './step-6-island-gen';

export interface CharacterCreatorState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  selectedRace?: string;
  selectedClass?: string;
  attributes?: Record<string, number>;
  spriteConfig?: {
    palette: {
      skinTone: number;
      hairColor: number;
      armorColor: number;
      clothColor: number;
    };
  };
  character?: any;
  homeIsland?: any;
  islandState?: any;
}

export default function CharacterCreator() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [state, setState] = useState<CharacterCreatorState>({ step: 1 });
  const [isLoading, setIsLoading] = useState(false);

  // Step progression
  const nextStep = () => {
    if (state.step < 6) {
      setState(prev => ({ ...prev, step: (prev.step + 1) as any }));
    }
  };

  const prevStep = () => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: (prev.step - 1) as any }));
    }
  };

  // Commit state for next step
  const updateState = (updates: Partial<CharacterCreatorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Step titles for progress display
  const stepTitles = [
    'Select Race',
    'Select Class',
    'Allocate Stats',
    'Avatar & Mint',
    'Island Preview',
    'Generate Island',
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-8">
        {/* Progress bar */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="flex justify-between mb-4">
            {stepTitles.map((title, i) => (
              <div
                key={i}
                className={cn(
                  'text-xs font-semibold transition-colors',
                  state.step === i + 1 ? 'text-amber-400' : state.step > i + 1 ? 'text-green-400' : 'text-slate-500'
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ width: '16.66%' }}
              animate={{ width: `${(state.step / 6) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Current step */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-2">{stepTitles[state.step - 1]}</h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={state.step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
            >
              {state.step === 1 && (
                <Step1Race state={state} updateState={updateState} onNext={nextStep} />
              )}
              {state.step === 2 && (
                <Step2Class state={state} updateState={updateState} onNext={nextStep} onPrev={prevStep} />
              )}
              {state.step === 3 && (
                <Step3Stats state={state} updateState={updateState} onNext={nextStep} onPrev={prevStep} />
              )}
              {state.step === 4 && (
                <Step4Avatar state={state} updateState={updateState} onNext={nextStep} onPrev={prevStep} />
              )}
              {state.step === 5 && (
                <Step5IslandIntro state={state} updateState={updateState} onNext={nextStep} onPrev={prevStep} />
              )}
              {state.step === 6 && (
                <Step6IslandGen state={state} updateState={updateState} onPrev={prevStep} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex gap-4 justify-between mt-8">
            <Button
              onClick={prevStep}
              disabled={state.step === 1 || isLoading}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {state.step < 6 && (
              <Button
                onClick={nextStep}
                disabled={!canProceed(state, state.step) || isLoading}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * Determine if user can proceed to next step
 * Validates required fields for current step
 */
function canProceed(state: CharacterCreatorState, step: number): boolean {
  switch (step) {
    case 1:
      return !!state.selectedRace;
    case 2:
      return !!state.selectedClass;
    case 3:
      return !!state.attributes;
    case 4:
      return !!state.character && !!state.character.cnftId;
    case 5:
      return !!state.islandState;
    case 6:
      return false; // Step 6 handles "Find Land" button
    default:
      return false;
  }
}

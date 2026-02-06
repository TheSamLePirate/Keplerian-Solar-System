import { useState, useCallback } from 'react';

export interface PanelLayoutState {
  panels: Record<string, boolean>;
  accordionState: Record<string, boolean>;
}

const DEFAULT_STATE: PanelLayoutState = {
  panels: {
    bodies: true,
    info: true,
    controls: true,
  },
  accordionState: {
    camera: true,
    simulation: true,
    lighting: false,
    quality: false,
    iss: false,
    atmosphere: false,
    postprocess: false,
  },
};

export function usePanelLayout() {
  const [state, setState] = useState<PanelLayoutState>(DEFAULT_STATE);

  const togglePanel = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      panels: { ...prev.panels, [id]: !prev.panels[id] },
    }));
  }, []);

  const setPanelVisible = useCallback((id: string, visible: boolean) => {
    setState(prev => ({
      ...prev,
      panels: { ...prev.panels, [id]: visible },
    }));
  }, []);

  const toggleAccordion = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      accordionState: { ...prev.accordionState, [id]: !prev.accordionState[id] },
    }));
  }, []);

  return {
    panels: state.panels,
    accordionState: state.accordionState,
    togglePanel,
    setPanelVisible,
    toggleAccordion,
  };
}

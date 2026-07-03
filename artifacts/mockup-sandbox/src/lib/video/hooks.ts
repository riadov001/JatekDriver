import { useState, useEffect } from 'react';

export function useVideoPlayer({ durations }: { durations: Record<string, number> }) {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    // Basic loop for preview purposes
    const sceneKeys = Object.keys(durations);
    const duration = durations[sceneKeys[currentScene]];

    if (currentScene === 0 && (window as any).startRecording) {
      (window as any).startRecording();
    }

    const timer = setTimeout(() => {
      const nextScene = currentScene + 1;
      if (nextScene >= sceneKeys.length) {
        if ((window as any).stopRecording) {
          (window as any).stopRecording();
        }
        setCurrentScene(0); // loop
      } else {
        setCurrentScene(nextScene);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [currentScene, durations]);

  return { currentScene };
}
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  login: 5000,
  dashboard: 6000,
  orders: 6000,
  earnings: 6000,
  profile: 6000
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0A1128] text-white">
      {/* Persistent background layers */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          className="absolute w-[80vw] h-[80vw] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #ec1e5a, transparent 70%)' }}
          animate={{ 
            x: ['-20%', '40%', '-10%'], 
            y: ['-10%', '30%', '-20%'], 
            scale: [1, 1.2, 0.9] 
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} 
        />
        <motion.div 
          className="absolute w-[60vw] h-[60vw] rounded-full opacity-10 blur-[100px] right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #ffffff, transparent 70%)' }}
          animate={{ 
            x: ['10%', '-30%', '5%'], 
            y: ['-10%', '-40%', '-10%'] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} 
        />
      </div>

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'linear-gradient(#ec1e5a 1px, transparent 1px), linear-gradient(90deg, #ec1e5a 1px, transparent 1px)', 
          backgroundSize: '4vw 4vw' 
        }} 
      />

      {/* Persistent UI Elements */}
      <motion.div 
        className="absolute top-[5vh] left-[4vw] z-20 text-[2vw] font-bold tracking-tighter flex items-center gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <div className="w-[1.5vw] h-[1.5vw] rounded-sm bg-[#ec1e5a]" />
        Jatek<span className="text-[#ec1e5a]">Livreur</span>
      </motion.div>

      {/* Foreground scenes */}
      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="popLayout">
          {currentScene === 0 && <Scene1 key="login" />}
          {currentScene === 1 && <Scene2 key="dashboard" />}
          {currentScene === 2 && <Scene3 key="orders" />}
          {currentScene === 3 && <Scene4 key="earnings" />}
          {currentScene === 4 && <Scene5 key="profile" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
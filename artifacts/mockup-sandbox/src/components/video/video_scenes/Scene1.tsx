import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Mocking imports for images since @assets might not resolve properly in sandbox without setup
const loginImg = "/driver_screenshots/login.jpg";

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full flex px-[10vw] items-center justify-between">
        <div className="w-1/2 pr-[5vw]">
          <motion.h1 
            className="text-[6vw] font-black leading-[1.1] mb-[2vh]"
            initial={{ opacity: 0, y: 50 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Drive <br/><span className="text-[#ec1e5a]">Your Way.</span>
          </motion.h1>
          <motion.p 
            className="text-[2vw] text-white/70"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            Log in to Jatek and start delivering in seconds.
          </motion.p>
        </div>
        
        <div className="w-1/2 flex justify-center relative">
          <motion.div 
            className="relative w-[25vw] aspect-[9/19] rounded-[2vw] overflow-hidden border-[0.5vw] border-[#1a2238] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            initial={{ opacity: 0, x: 100, rotateY: 30 }}
            animate={phase >= 1 ? { opacity: 1, x: 0, rotateY: -5 } : { opacity: 0, x: 100, rotateY: 30 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ perspective: 1000 }}
          >
            <img src={loginImg} className="w-full h-full object-cover" alt="Login screen" />
            
            {phase >= 3 && (
              <motion.div 
                className="absolute inset-0 bg-[#ec1e5a]/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
              />
            )}
          </motion.div>
          
          <motion.div 
            className="absolute -z-10 w-[30vw] h-[30vw] bg-[#ec1e5a] rounded-full blur-[80px] opacity-20"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>
      </div>
    </motion.div>
  );
}
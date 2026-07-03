import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const homeImg = "/driver_screenshots/home.jpg";

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center pt-[10vh]"
      initial={{ opacity: 0, y: '20vh' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '-20vh' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div 
        className="text-center mb-[5vh]"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-[4vw] font-bold">Go <span className="text-[#ec1e5a]">Online</span> Instantly</h2>
        <p className="text-[1.5vw] text-white/60">One tap to start receiving orders.</p>
      </motion.div>

      <div className="relative">
        <motion.div 
          className="relative z-10 w-[22vw] aspect-[9/19] rounded-[2vw] overflow-hidden border-[0.5vw] border-[#1a2238] shadow-[0_30px_60px_rgba(236,30,90,0.2)]"
          initial={{ opacity: 0, y: 100 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <img src={homeImg} className="w-full h-full object-cover" alt="Home dashboard" />
        </motion.div>

        {phase >= 3 && (
          <motion.div 
            className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[15vw] h-[15vw] bg-white rounded-full mix-blend-overlay blur-[20px]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.5, 0], scale: [0.5, 1.5, 2] }}
            transition={{ duration: 1.5 }}
          />
        )}
        
        {/* Decorative elements */}
        {phase >= 2 && (
          <>
            <motion.div 
              className="absolute top-[20%] -left-[15vw] w-[10vw] h-[10vw] border border-[#ec1e5a]/30 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
            />
            <motion.div 
              className="absolute bottom-[30%] -right-[15vw] w-[15vw] h-[15vw] border border-white/10 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
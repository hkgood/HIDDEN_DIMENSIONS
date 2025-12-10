import { getTheme } from './theme/colorPalettes';
import { generateTailwindColors } from './theme/cssColors';

// 获取默认主题（暖橙梦境）
const defaultTheme = getTheme('warmCoral');
const themeColors = generateTailwindColors(defaultTheme);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主题颜色
        ...themeColors,
        
        // 语义化颜色别名
        goal: themeColors.accent.gold,
        player: themeColors.accent.cyan,
        interactive: themeColors.accent.cyan,
        danger: themeColors.ui.error,
      },
      
      // 自定义动画
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
      
      // 阴影
      boxShadow: {
        'glow': '0 0 20px rgba(255, 217, 61, 0.5)',
        'glow-strong': '0 0 30px rgba(255, 217, 61, 0.8)',
      },
    },
  },
  plugins: [],
}


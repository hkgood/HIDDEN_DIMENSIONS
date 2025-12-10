/**
 * 🎨 色板可视化预览工具
 * 
 * 用于在浏览器中预览所有主题色板
 * 访问路径: /color-palette-preview
 */

import React from 'react';
import { allThemes, type ColorPalette } from './colorPalettes';

// 单个颜色块组件
const ColorSwatch: React.FC<{ color: string; label?: string }> = ({ color, label }) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-16 h-16 rounded-lg shadow-md border border-gray-200 transition-transform hover:scale-110"
        style={{ backgroundColor: color }}
        title={color}
      />
      {label && <span className="text-xs text-gray-600">{label}</span>}
    </div>
  );
};

// 颜色组显示
const ColorGroup: React.FC<{ title: string; colors: string[] }> = ({ title, colors }) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {colors.map((color, index) => (
          <ColorSwatch key={index} color={color} label={`#${index + 1}`} />
        ))}
      </div>
    </div>
  );
};

// 背景预览（支持渐变）
const BackgroundPreview: React.FC<{ background: ColorPalette['background'] }> = ({ background }) => {
  const skyColors = Array.isArray(background.sky) ? background.sky : [background.sky];
  
  const gradientStyle = skyColors.length > 1
    ? {
        background: `linear-gradient(to bottom, ${skyColors.join(', ')})`
      }
    : {
        backgroundColor: skyColors[0]
      };
  
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">背景预览</h3>
      <div
        className="w-full h-32 rounded-lg shadow-md border border-gray-200"
        style={gradientStyle}
      >
        {background.horizon && (
          <div
            className="h-8 mt-16"
            style={{ backgroundColor: background.horizon, opacity: 0.5 }}
          />
        )}
        {background.ground && (
          <div
            className="h-8"
            style={{ backgroundColor: background.ground }}
          />
        )}
      </div>
    </div>
  );
};

// 单个主题卡片
const ThemeCard: React.FC<{ theme: ColorPalette }> = ({ theme }) => {
  const skyColor = Array.isArray(theme.background.sky) 
    ? theme.background.sky[0] 
    : theme.background.sky;
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* 主题标题 */}
      <div 
        className="rounded-lg p-4 mb-4 text-white"
        style={{ backgroundColor: skyColor }}
      >
        <h2 className="text-2xl font-bold">{theme.name}</h2>
        <p className="text-sm opacity-90 mt-1">{theme.description}</p>
      </div>
      
      {/* 背景预览 */}
      <BackgroundPreview background={theme.background} />
      
      {/* 主色调 */}
      <ColorGroup title="主色调 (Primary)" colors={theme.primary} />
      
      {/* 辅助色 */}
      <ColorGroup title="辅助色 (Secondary)" colors={theme.secondary} />
      
      {/* 强调色 */}
      <ColorGroup title="强调色 (Accent)" colors={theme.accent} />
      
      {/* 光照颜色 */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">光照 (Lighting)</h3>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch color={theme.lighting.ambient} label="环境" />
          <ColorSwatch color={theme.lighting.directional} label="方向" />
          <ColorSwatch color={theme.lighting.highlight} label="高光" />
          <ColorSwatch 
            color={theme.lighting.shadow.slice(0, 7)} 
            label="阴影" 
          />
        </div>
      </div>
      
      {/* UI 颜色 */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">UI 颜色</h3>
        <div className="flex flex-wrap gap-3">
          <ColorSwatch color={theme.ui.text} label="文本" />
          <ColorSwatch color={theme.ui.border} label="边框" />
          <ColorSwatch color={theme.ui.success} label="成功" />
          <ColorSwatch color={theme.ui.warning} label="警告" />
          <ColorSwatch color={theme.ui.error} label="错误" />
        </div>
      </div>
      
      {/* 代码示例 */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
          查看使用代码 ▼
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
{`import { ThemeColorManager } from '@/theme';

const colorManager = new ThemeColorManager('${theme.name.toLowerCase().replace(/\s/g, '')}');
const mainColor = colorManager.getPrimaryColor(0);
const accentColor = colorManager.getAccentColor(0);`}
        </pre>
      </details>
    </div>
  );
};

// 主预览组件
export const ColorPalettePreview: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const filteredThemes = allThemes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    theme.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎨 Hidden Dimensions 色板系统
          </h1>
          <p className="text-gray-600">
            8个精心设计的主题配色方案，源自 Monument Valley 美学
          </p>
        </div>
        
        {/* 搜索框 */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="搜索主题名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md mx-auto block px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* 主题网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredThemes.map((theme, index) => (
            <ThemeCard key={index} theme={theme} />
          ))}
        </div>
        
        {/* 空状态 */}
        {filteredThemes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">未找到匹配的主题</p>
          </div>
        )}
        
        {/* 页脚信息 */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>共 {allThemes.length} 个主题 · 查看 <code className="bg-gray-100 px-2 py-1 rounded">theme/README.md</code> 了解详细用法</p>
        </div>
      </div>
    </div>
  );
};

export default ColorPalettePreview;


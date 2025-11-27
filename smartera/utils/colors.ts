// Unified Color Theme for Smart Home App
// Use these colors consistently across all screens

const Colors = {
  // Primary Brand Colors
  primary: '#5B6EF5',           // Main blue-purple (indigo)
  primaryDark: '#4A5BD4',       // Darker variant
  primaryLight: '#7B8AF7',      // Lighter variant
  
  // Secondary/Accent Colors
  secondary: '#8B5CF6',         // Purple
  accent: '#06B6D4',            // Cyan/Teal
  
  // Gradient Presets (typed as tuples for LinearGradient)
  gradients: {
    primary: ['#5B6EF5', '#8B5CF6'] as const,      // Blue to purple
    primaryDark: ['#1E2340', '#2D3561'] as const,  // Dark mode header
    success: ['#10B981', '#059669'] as const,      // Green
    warning: ['#F59E0B', '#D97706'] as const,      // Orange/Amber
    danger: ['#EF4444', '#DC2626'] as const,       // Red
    error: ['#EF4444', '#DC2626'] as const,        // Alias for danger
    info: ['#3B82F6', '#2563EB'] as const,         // Blue
  },
  
  // Status Colors
  success: '#10B981',           // Green - online, active, success
  warning: '#F59E0B',           // Amber - standby, caution
  danger: '#EF4444',            // Red - offline, error, alert
  error: '#EF4444',             // Alias for danger (common naming)
  info: '#3B82F6',              // Blue - info, notifications
  
  // Power/Energy Colors
  power: '#F59E0B',             // Amber for power indicators
  energy: '#10B981',            // Green for energy efficiency
  
  // Device Type Colors
  deviceTypes: {
    SMART_PLUG: '#10B981',      // Green
    RGB_LIGHT: '#F59E0B',       // Amber
    THERMOSTAT: '#3B82F6',      // Blue
    SENSOR: '#8B5CF6',          // Purple
  },
  
  // Room Colors (for room cards)
  rooms: {
    livingRoom: '#10B981',
    bedroom: '#3B82F6',
    kitchen: '#F59E0B',
    bathroom: '#06B6D4',
    office: '#8B5CF6',
    garage: '#64748B',
    garden: '#84CC16',
    diningRoom: '#A78BFA',
  },
  
  // Light Theme
  light: {
    background: '#F8FAFC',      // Slightly blue-gray
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    divider: '#F1F5F9',
  },
  
  // Dark Theme
  dark: {
    background: '#0F172A',      // Deep blue-black
    surface: '#1E293B',
    surfaceVariant: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#334155',
    divider: '#1E293B',
  },
};

// Helper function to add alpha/opacity to a hex color
export const withAlpha = (hex: string, alpha: number): string => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper function to get theme colors
export const getThemeColors = (isDark: boolean) => {
  return isDark ? Colors.dark : Colors.light;
};

// Export as both default and named for compatibility
export { Colors };
export default Colors;

// Type exports for TypeScript usage
export type GradientTuple = readonly [string, string];

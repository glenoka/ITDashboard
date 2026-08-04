import React from 'react';
import * as icons from 'lucide-react';

export default function Icon({ name, size = 16, strokeWidth = 1.5, ...props }) {
  const Cmp = icons[name] || icons.Circle;
  return <Cmp size={size} strokeWidth={strokeWidth} {...props} />;
}

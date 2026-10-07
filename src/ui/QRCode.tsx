import QR from 'qrcode';
import React, { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Pure-JS QR renderer (works offline, no native module beyond react-native-svg). */
export function QRCode({ value, size = 240, color = '#111', background = '#fff' }: { value: string; size?: number; color?: string; background?: string }) {
  const { path, count } = useMemo(() => {
    const qr = QR.create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const data = qr.modules.data;
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (data[y * n + x]) d += `M${x + 4} ${y + 4}h1v1h-1z`;
      }
    }
    return { path: d, count: n + 8 }; // 4-module quiet zone
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
      <Rect x={0} y={0} width={count} height={count} fill={background} />
      <Path d={path} fill={color} />
    </Svg>
  );
}

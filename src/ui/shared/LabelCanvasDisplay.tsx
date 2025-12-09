import type { CSSProperties } from "react";
import { QRCode } from "react-qr-code";
import type { LabelFormat, LabelLayout, LayoutElement } from "../../domain/models";
import { resolveElementDisplayValue } from "../../shared/layoutElementUtils";

export interface LabelCanvasDisplayProps {
  layout: LabelLayout;
  format?: LabelFormat | null;
  resolvedMap: Record<string, string>;
  scale?: number;
  className?: string;
  containerStyle?: CSSProperties;
}

export function LabelCanvasDisplay({
  layout,
  format,
  resolvedMap,
  scale = 1,
  className,
  containerStyle,
}: LabelCanvasDisplayProps): JSX.Element {
  const canvasWidth = format?.widthPx ?? 600;
  const canvasHeight = format?.heightPx ?? 320;
  const marginLeft = Math.max(0, format?.marginLeftPx ?? 0);
  const marginRight = Math.max(0, format?.marginRightPx ?? 0);
  const marginTop = Math.max(0, format?.marginTopPx ?? 0);
  const marginBottom = Math.max(0, format?.marginBottomPx ?? 0);
  const contentWidth = Math.max(0, canvasWidth - marginLeft - marginRight);
  const contentHeight = Math.max(0, canvasHeight - marginTop - marginBottom);
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;
  const scaledMarginLeft = marginLeft * scale;
  const scaledMarginTop = marginTop * scale;
  const scaledContentWidth = contentWidth * scale;
  const scaledContentHeight = contentHeight * scale;

  const style: CSSProperties = {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    position: "relative",
    background: "#ffffff",
    borderRadius: 0,
    boxSizing: "border-box",
    ...containerStyle,
  };

  const contentStyle: CSSProperties = {
    position: "absolute",
    left: `${scaledMarginLeft}px`,
    top: `${scaledMarginTop}px`,
    width: `${Math.max(scaledContentWidth, 0)}px`,
    height: `${Math.max(scaledContentHeight, 0)}px`,
    overflow: "hidden",
  };

  return (
    <div className={className} style={style}>
      <div style={contentStyle}>
        {layout.elements.map((element) => (
          <div key={element.id} style={buildElementStyle(element, scale)}>
            {renderElementContent(element, resolvedMap, scale)}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildElementStyle(element: LayoutElement, scale: number): CSSProperties {
  const scaledWidth = Math.max(0, element.width * scale);
  const scaledHeight = Math.max(0, element.height * scale);
  const justifyContent =
    element.type === "qrcode"
      ? "center"
      : element.textAlignment === "center"
      ? "center"
      : "flex-start";
  const rotation = element.rotation ?? 0;
  return {
    position: "absolute",
    left: element.positionX * scale,
    top: element.positionY * scale,
    width: scaledWidth,
    height: scaledHeight,
    display: "flex",
    alignItems: "center",
    justifyContent,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "0 0",
    padding: 0,
    fontWeight: 600,
    color: "#1c1c1e",
    lineHeight: 1.2,
    boxSizing: "border-box",
  };
}

function renderElementContent(element: LayoutElement, resolvedMap: Record<string, string>, scale: number): JSX.Element {
  const value = resolveElementDisplayValue(element, resolvedMap);
  if (element.type === "qrcode") {
    const qrSize = Math.max(1, Math.floor(Math.min(element.width, element.height) * scale));
    const safeValue = value || " ";
    return (
      <QRCode
        value={safeValue}
        size={qrSize}
        bgColor="#ffffff"
        fgColor="#1c1c1e"
        level="L"
        aria-hidden="true"
        style={{ width: "100%", height: "100%" }}
      />
    );
  }
  const baseFontSize = element.fontSize ? element.fontSize * scale : undefined;
  const fittedFontSize = getFittedFontSize(element, value, scale);
  const finalFontSize = fittedFontSize ?? baseFontSize;
  const textStyle: CSSProperties = {
    overflowWrap: "break-word",
    textAlign: element.textAlignment ?? "left",
    width: "100%",
    fontSize: finalFontSize,
  };
  return <span style={textStyle}>{value || "-"}</span>;
}

let measurementContext: CanvasRenderingContext2D | null = null;

function getMeasurementContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (measurementContext) return measurementContext;
  const canvas = document.createElement("canvas");
  measurementContext = canvas.getContext("2d");
  return measurementContext;
}

function getFittedFontSize(element: LayoutElement, value: string, scale: number): number | undefined {
  if (!element.shrinkToFit || !element.fontSize) return undefined;
  const ctx = getMeasurementContext();
  if (!ctx) return undefined;
  const baseSize = element.fontSize * scale;
  ctx.font = `${baseSize}px Inter, system-ui`;
  const textWidth = ctx.measureText(value || " ").width;
  const availableWidth = Math.max(1, element.width * scale);
  if (textWidth <= availableWidth) return baseSize;
  const ratio = availableWidth / textWidth;
  return Math.max(baseSize * ratio, 6);
}

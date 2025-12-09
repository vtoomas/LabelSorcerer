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
  const marginLeft = format?.marginLeftPx ?? 0;
  const marginTop = format?.marginTopPx ?? 0;
  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;

  const style: CSSProperties = {
    width: `${scaledWidth}px`,
    height: `${scaledHeight}px`,
    position: "relative",
    background: "#ffffff",
    boxSizing: "border-box",
    ...containerStyle,
  };

  return (
    <div className={className} style={style}>
      {layout.elements.map((element) => {
        const elementStyle = buildElementStyle(element, scale, marginLeft, marginTop);
        return (
          <div key={element.id} style={elementStyle}>
            {renderElementContent(element, resolvedMap, scale)}
          </div>
        );
      })}
    </div>
  );
}

function buildElementStyle(
  element: LayoutElement,
  scale: number,
  marginLeft: number,
  marginTop: number,
): CSSProperties {
  const scaledWidth = element.width * scale;
  const scaledHeight = element.height * scale;
  return {
    position: "absolute",
    left: (element.positionX + marginLeft) * scale,
    top: (element.positionY + marginTop) * scale,
    width: scaledWidth,
    height: scaledHeight,
    display: "flex",
    alignItems: "center",
    justifyContent: element.type === "qrcode" ? "center" : "flex-start",
    padding: 0,
    fontWeight: 600,
    fontSize: element.fontSize ? element.fontSize * scale : undefined,
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
  return <span style={{ overflowWrap: "break-word" }}>{value || "-"}</span>;
}

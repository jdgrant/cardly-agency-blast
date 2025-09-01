/**
 * Unified React card renderer for consistent layout across all previews
 */

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { LayoutConfig, CardContent, formatMessageWithLineBreak } from "./layout-config";

interface CardRendererProps {
  layout: LayoutConfig;
  content: CardContent;
  type: 'front' | 'inside';
  className?: string;
}

export function CardRenderer({ layout, content, type, className = '' }: CardRendererProps) {
  if (type === 'front') {
    return (
      <AspectRatio ratio={layout.aspectRatio} className={className}>
        <div className="w-full h-full border-2 border-border rounded-md overflow-hidden bg-card">
          {content.templatePreviewUrl && (
            <img
              src={content.templatePreviewUrl}
              alt="Card front preview"
              className="w-full h-full object-contain"
              loading="lazy"
            />
          )}
        </div>
      </AspectRatio>
    );
  }

  // Inside layout
  const { firstLine, secondLine, shouldBreak } = formatMessageWithLineBreak(content.message);
  
  return (
    <AspectRatio ratio={layout.aspectRatio} className={className}>
      {layout.isSpread ? (
        // Spread layout: left blank, right content
        <div className="w-full h-full bg-background border-2 border-border rounded-md overflow-hidden flex">
          {/* Left half: blank */}
          <div className="w-1/2 h-full bg-white" />
          
          {/* Right half: inside content */}
          <div className="w-1/2 h-full bg-background">
            <InsideContent 
              firstLine={firstLine}
              secondLine={secondLine}
              shouldBreakLine={shouldBreak}
              logoUrl={content.logoUrl}
              signatureUrl={content.signatureUrl}
            />
          </div>
        </div>
      ) : (
        // Normal inside layout
        <div className="w-full h-full bg-background border-2 border-border rounded-md overflow-hidden">
          <InsideContent 
            firstLine={firstLine}
            secondLine={secondLine}
            shouldBreakLine={shouldBreak}
            logoUrl={content.logoUrl}
            signatureUrl={content.signatureUrl}
          />
        </div>
      )}
    </AspectRatio>
  );
}

interface InsideContentProps {
  firstLine: string;
  secondLine: string;
  shouldBreakLine: boolean;
  logoUrl?: string;
  signatureUrl?: string;
}

function InsideContent({ firstLine, secondLine, shouldBreakLine, logoUrl, signatureUrl }: InsideContentProps) {
  return (
    <div className="w-full h-full grid grid-rows-3 p-8 relative">
      {/* Top third: message */}
      <div className="row-start-1 row-end-2 flex items-center justify-center">
        <div className="text-center max-w-[80%]">
          <p className="text-lg leading-relaxed italic text-foreground/90">
            {shouldBreakLine ? (
              <>
                {firstLine}
                <br />
                {secondLine}
              </>
            ) : (
              firstLine
            )}
          </p>
        </div>
      </div>

      {/* Middle third: spacer (empty) */}
      <div className="row-start-2 row-end-3" />

      {/* Logo positioning */}
      {logoUrl && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[56%] flex items-center justify-center">
          <img
            src={logoUrl}
            alt="Company logo"
            className="max-h-14 max-w-[180px] object-contain"
            loading="lazy"
          />
        </div>
      )}

      {/* Signature positioning - centered */}
      {signatureUrl && (
        <div className="absolute left-0 right-0 top-[68%] flex justify-center">
          <img 
            src={signatureUrl} 
            alt="Signature" 
            loading="lazy" 
            style={{width: "480px"}} 
          />
        </div>
      )}
    </div>
  );
}
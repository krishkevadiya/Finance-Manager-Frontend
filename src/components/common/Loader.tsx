import React from "react";
import { Loader2 } from "lucide-react";

export interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
  size?: number;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  message = "Loading...",
  fullScreen = true,
  size = 24,
  className = "",
}) => {
  return (
    <div
      className={`common-loader-wrapper ${
        fullScreen ? "common-loader-fullscreen" : "common-loader-inline"
      } ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="common-loader-box">
        <Loader2 size={size} className="common-loader-spinner" />
        {message && <span className="common-loader-message">{message}</span>}
      </div>
    </div>
  );
};

export default Loader;

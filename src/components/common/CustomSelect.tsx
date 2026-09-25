import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  zIndex?: number;
  disabled?: boolean;
  minHeight?: number;
  borderRadius?: number;
  buttonStyle?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  menuPlacement?: "top" | "bottom";
  menuWidth?: string | number;
  menuMaxHeight?: number;
  align?: "left" | "right";
}

export default function CustomSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Select option",
  isOpen: isOpenProp,
  onOpenChange,
  zIndex = 70,
  disabled = false,
  minHeight,
  borderRadius = 12,
  buttonStyle,
  containerStyle,
  menuPlacement = "bottom",
  menuWidth,
  menuMaxHeight = 220,
  align = "left",
}: CustomSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = isOpenProp !== undefined;
  const open = isControlled ? isOpenProp : internalOpen;

  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof next === "function" ? next(open) : next;
    if (!isControlled) {
      setInternalOpen(nextVal);
    }
    onOpenChange?.(nextVal);
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    if (!open) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [open]);

  const isTop = menuPlacement === "top";

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        ...containerStyle,
      }}
    >
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: 5,
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
          }}
        >
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
        disabled={disabled}
        aria-expanded={open}
        style={{
          width: "100%",
          minHeight: minHeight ?? 44,
          padding: "0 12px",
          border: open ? "1px solid #3b5bdb" : "1px solid #d4d9f5",
          borderRadius,
          background: disabled ? "#f8fafc" : "#ffffff",
          color: disabled ? "#94a3b8" : "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          boxSizing: "border-box",
          boxShadow: open
            ? "0 0 0 3px rgba(59, 91, 219, 0.12)"
            : "0 1px 2px rgba(15, 23, 42, 0.04)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          opacity: disabled ? 0.65 : 1,
          ...buttonStyle,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: selectedOption ? 600 : 450,
            color: selectedOption ? "#0f172a" : "#94a3b8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "left",
          }}
        >
          {displayLabel}
        </span>

        <ChevronDown
          size={16}
          style={{
            color: "#64748b",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex,
            top: isTop ? "auto" : "calc(100% + 6px)",
            bottom: isTop ? "calc(100% + 6px)" : "auto",
            left: align === "right" ? "auto" : 0,
            right: align === "right" ? 0 : (menuWidth ? "auto" : 0),
            width: menuWidth ?? (align === "right" ? "max-content" : undefined),
            minWidth: menuWidth ?? "100%",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            boxShadow:
              "0 12px 36px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(186, 215, 245, 0.6)",
            padding: 6,
            maxHeight: menuMaxHeight,
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: "none",
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 450,
                  color: isSelected ? "#3b5bdb" : "#1e293b",
                  background: isSelected ? "#eaedff" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s ease, color 0.12s ease",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#eaedff";
                    e.currentTarget.style.color = "#3b5bdb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#1e293b";
                  }
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {option.label}
                </span>

                {isSelected && (
                  <Check
                    size={15}
                    color="#3b5bdb"
                    style={{ flexShrink: 0, marginLeft: 8 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

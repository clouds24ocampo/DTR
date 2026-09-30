import React, { useRef, useEffect, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ArrowDownAZ, Indent, Outdent, Eraser, Paintbrush2, Scissors, Copy,
  ClipboardPaste, ChevronDown, Type, TextCursor,
} from "lucide-react";
import clsx from "clsx";

const COLORS = [
  "#000000", "#FF0000", "#FFA500", "#FFFF00", "#008000",
  "#00BFFF", "#0000FF", "#800080", "#FFFFFF",
];
const HIGHLIGHTS = [
  "#FFFF00", "#00FF00", "#00FFFF", "#FFC0CB", "#FFD700", "#FFFFFF"
];
const FONT_SIZES = [
  { label: "8", value: "1" }, { label: "10", value: "2" }, { label: "12", value: "3" },
  { label: "14", value: "4" }, { label: "18", value: "5" }, { label: "24", value: "6" }, { label: "36", value: "7" },
];
const FONT_FAMILIES = [
  "Arial", "Calibri", "Comic Sans MS", "Courier New",
  "Georgia", "Tahoma", "Times New Roman", "Verdana",
];

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  autoHideToolbar?: boolean;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter your message here...",
  disabled = false,
  error = false,
  autoHideToolbar = false,
  className,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const executeCommand = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleInput();
    },
    [handleInput]
  );

  const handleClipboard = useCallback(
    (cmd: "cut" | "copy" | "paste") => {
      if (cmd === "paste") {
        editorRef.current?.focus();
        navigator.clipboard.readText().then((plainText) => {
          document.execCommand("insertText", false, plainText);
          handleInput();
        }).catch(() => {
          executeCommand("paste");
        });
      } else {
        executeCommand(cmd);
      }
    },
    [executeCommand, handleInput]
  );

  const handleFormatPainter = () => alert("Format Painter not implemented.");
  const handleChangeCase = (type: "upper" | "lower" | "capitalize") => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selected = range.toString();
    let newText = selected;
    if (type === "upper") newText = selected.toUpperCase();
    if (type === "lower") newText = selected.toLowerCase();
    if (type === "capitalize") newText = selected.replace(/\b\w/g, c => c.toUpperCase());
    document.execCommand("insertText", false, newText);
    handleInput();
  };

  const handleSort = () => alert("Sort feature not implemented.");
  const handleShowFormatting = () => alert("Show/Hide formatting marks not implemented.");
  const handleLineSpacing = (spacing: string) => {
    document.execCommand("formatBlock", false, "div");
    document.execCommand(
      "insertHTML",
      false,
      `<div style="line-height:${spacing};">${window.getSelection()?.toString()}</div>`
    );
    handleInput();
  };
  const handleBorders = () => alert("Border feature not implemented.");

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
    handleInput();
  }, [handleInput]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const plainText = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, plainText);
      handleInput();
    },
    [handleInput]
  );

  return (
    <div
      ref={containerRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`border rounded-lg shadow-sm ${error ? "border-red-500" : "border-gray-300"} ${disabled ? "opacity-50" : ""}`}
    >
      {(!autoHideToolbar || isFocused) && (
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        {/* Clipboard */}
        <button title="Paste" className="toolbar-btn" onClick={() => handleClipboard("paste")} disabled={disabled}><ClipboardPaste className="icon" /></button>
        <button title="Cut" className="toolbar-btn" onClick={() => handleClipboard("cut")} disabled={disabled}><Scissors className="icon" /></button>
        <button title="Copy" className="toolbar-btn" onClick={() => handleClipboard("copy")} disabled={disabled}><Copy className="icon" /></button>
        <button title="Format Painter" className="toolbar-btn" onClick={handleFormatPainter} disabled={disabled}><Paintbrush2 className="icon" /></button>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        {/* Font family */}
        <select className="toolbar-select" onChange={e => executeCommand("fontName", e.target.value)} disabled={disabled} defaultValue="" title="Font">
          <option value="" disabled>Font</option>
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {/* Font size */}
        <select className="toolbar-select w-[45px]" onChange={e => executeCommand("fontSize", e.target.value)} disabled={disabled} defaultValue="2" title="Font size">
          {FONT_SIZES.map(fs => <option key={fs.value} value={fs.value}>{fs.label}</option>)}
        </select>
        {/* Increase/Decrease font size */}
        <button title="Increase Font Size" className="toolbar-btn" onClick={() => executeCommand("fontSize", "5")} disabled={disabled}><ChevronDown className="rotate-180 icon" /></button>
        <button title="Decrease Font Size" className="toolbar-btn" onClick={() => executeCommand("fontSize", "2")} disabled={disabled}><ChevronDown className="icon" /></button>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        {/* Change Case */}
        <button title="UPPERCASE" className="toolbar-btn" onClick={() => handleChangeCase("upper")} disabled={disabled}><Type className="icon" /></button>
        <button title="lowercase" className="toolbar-btn" onClick={() => handleChangeCase("lower")} disabled={disabled}><Type className="icon" /></button>
        <button title="Capitalize" className="toolbar-btn" onClick={() => handleChangeCase("capitalize")} disabled={disabled}><Type className="icon" /></button>
        {/* Clear formatting */}
        <button title="Clear Formatting" className="toolbar-btn" onClick={() => executeCommand("removeFormat")} disabled={disabled}><Eraser className="icon" /></button>
        {/* Font Styles */}
        <button title="Bold" className="toolbar-btn" onClick={() => executeCommand("bold")} disabled={disabled}><Bold className="icon" /></button>
        <button title="Italic" className="toolbar-btn" onClick={() => executeCommand("italic")} disabled={disabled}><Italic className="icon" /></button>
        <button title="Underline" className="toolbar-btn" onClick={() => executeCommand("underline")} disabled={disabled}><Underline className="icon" /></button>
        <button title="Strikethrough" className="toolbar-btn" onClick={() => executeCommand("strikeThrough")} disabled={disabled}><Strikethrough className="icon" /></button>
        <button title="Subscript" className="toolbar-btn" onClick={() => executeCommand("subscript")} disabled={disabled}><Subscript className="icon" /></button>
        <button title="Superscript" className="toolbar-btn" onClick={() => executeCommand("superscript")} disabled={disabled}><Superscript className="icon" /></button>
        {/* Text Color */}
        <select className="toolbar-select" onChange={e => executeCommand("foreColor", e.target.value)} disabled={disabled} defaultValue="" title="Text Color">
          <option value="" disabled>Text Color</option>
          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Highlight */}
        <select className="toolbar-select" onChange={e => executeCommand("hiliteColor", e.target.value)} disabled={disabled} defaultValue="" title="Highlight">
          <option value="" disabled>Highlight</option>
          {HIGHLIGHTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="w-px h-5 bg-gray-300 mx-1" />
        {/* Lists & Paragraph */}
        <button title="Bulleted List" className="toolbar-btn" onClick={() => executeCommand("insertUnorderedList")} disabled={disabled}><List className="icon" /></button>
        <button title="Numbered List" className="toolbar-btn" onClick={() => executeCommand("insertOrderedList")} disabled={disabled}><ListOrdered className="icon" /></button>
        <button title="Indent" className="toolbar-btn" onClick={() => executeCommand("indent")} disabled={disabled}><Indent className="icon" /></button>
        <button title="Outdent" className="toolbar-btn" onClick={() => executeCommand("outdent")} disabled={disabled}><Outdent className="icon" /></button>
        <button title="Sort" className="toolbar-btn" onClick={handleSort} disabled={disabled}><ArrowDownAZ className="icon" /></button>
        <button title="Show/Hide Formatting" className="toolbar-btn" onClick={handleShowFormatting} disabled={disabled}><TextCursor className="icon" /></button>
        {/* Align */}
        <button title="Align Left" className="toolbar-btn" onClick={() => executeCommand("justifyLeft")} disabled={disabled}><AlignLeft className="icon" /></button>
        <button title="Align Center" className="toolbar-btn" onClick={() => executeCommand("justifyCenter")} disabled={disabled}><AlignCenter className="icon" /></button>
        <button title="Align Right" className="toolbar-btn" onClick={() => executeCommand("justifyRight")} disabled={disabled}><AlignRight className="icon" /></button>
        <button title="Justify" className="toolbar-btn" onClick={() => executeCommand("justifyFull")} disabled={disabled}><AlignJustify className="icon" /></button>
        {/* Line spacing */}
        <select className="toolbar-select w-[70px]" onChange={e => handleLineSpacing(e.target.value)} disabled={disabled} defaultValue="" title="Line Spacing">
          <option value="" disabled>Spacing</option>
          <option value="1">1.0</option>
          <option value="1.5">1.5</option>
          <option value="2">2.0</option>
        </select>
        {/* Shading */}
        <select className="toolbar-select" onChange={e => executeCommand("hiliteColor", e.target.value)} disabled={disabled} defaultValue="" title="Shading">
          <option value="" disabled>Shading</option>
          {HIGHLIGHTS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Borders */}
        <button title="Borders" className="toolbar-btn" onClick={handleBorders} disabled={disabled}><Type className="icon" /></button>
      </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        className={clsx(
          "p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150",
          !className?.includes("min-h-") && "min-h-[150px]",
          className,
          disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"
        )}
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
          outline: "none",
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        spellCheck={true}
        aria-disabled={disabled}
        tabIndex={0}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9CA3AF;
            pointer-events: none;
          }
          [contenteditable]:focus:before { content: none; }
          .toolbar-btn { padding: 0.2rem 0.4rem; border-radius: 0.25rem; transition: background 0.1s; margin-right: 2px; background: none; border: none; cursor: pointer; }
          .toolbar-btn:disabled { cursor: not-allowed; opacity: 0.5; }
          .toolbar-btn:hover:not(:disabled) { background: #f3f4f6; }
          .toolbar-select { padding: 0.1rem 0.4rem; border: 1px solid #d1d5db; border-radius: 0.25rem; font-size: 0.9rem; margin-right: 2px; background: #fff; }
          .icon { width: 1em; height: 1em; vertical-align: middle; }
          [contenteditable] ul, [contenteditable] ol {
            padding-left: 2em;
            margin: 0.5em 0;
            list-style: initial !important;
          }
          [contenteditable] li { margin: 0.2em 0; }
          `,
        }}
      />
    </div>
  );
};

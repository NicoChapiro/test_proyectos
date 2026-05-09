"use client";

type SuggestedDateButtonProps = {
  inputId: string;
  value: string;
};

export function SuggestedDateButton({ inputId, value }: SuggestedDateButtonProps) {
  return (
    <button
      className="date-planner-suggestion-button"
      type="button"
      onClick={() => {
        const input = document.getElementById(inputId);
        if (input instanceof HTMLInputElement) {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        }
      }}
    >
      Usar sugerida
    </button>
  );
}

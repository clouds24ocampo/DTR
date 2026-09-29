import React from "react";

interface RadioOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    description?: string;
}

interface RadioGroupProps {
    options: RadioOption[];
    selectedValue: string;
    onChange: (value: string) => void;
    name: string;
    layout?: "grid" | "stack";
    columns?: number;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
    options,
    selectedValue,
    onChange,
    name,
    layout = "grid",
    columns = 2,
}) => {
    const containerClasses =
        layout === "grid"
            ? `grid grid-cols-1 sm:grid-cols-${columns} gap-3`
            : "flex flex-col gap-3";

    return (
        <div className={containerClasses}>
            {options.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                    <label
                        key={option.value}
                        className={`
              relative flex items-center p-4 cursor-pointer rounded-lg border-2 transition-all
              ${isSelected
                                ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                                : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                            }
            `}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={isSelected}
                            onChange={() => onChange(option.value)}
                            className="sr-only"
                        />
                        <div className="flex items-center gap-3 w-full">
                            {option.icon && (
                                <div
                                    className={`p-2 rounded-lg ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                                        }`}
                                >
                                    {option.icon}
                                </div>
                            )}
                            <div className="flex-1">
                                <div
                                    className={`text-sm font-semibold ${isSelected ? "text-blue-900" : "text-gray-900"
                                        }`}
                                >
                                    {option.label}
                                </div>
                                {option.description && (
                                    <div
                                        className={`text-xs mt-0.5 ${isSelected ? "text-blue-700" : "text-gray-500"
                                            }`}
                                    >
                                        {option.description}
                                    </div>
                                )}
                            </div>
                            <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-blue-600" : "border-gray-300"
                                    }`}
                            >
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                            </div>
                        </div>
                    </label>
                );
            })}
        </div>
    );
};

export type Size = "tiny" | "small" | "medium" | "large" | "huge";

export function sizeToRelativeHeight(size: Size): string {
    switch (size) {
        case "tiny":
            return "1em";
        case "small":
            return "2em";
        case "medium":
            return "3em";
        case "large":
            return "4em";
        case "huge":
            return "5em";
    }
}

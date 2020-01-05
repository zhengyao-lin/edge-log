import React, { FunctionComponent } from "react";
import { Size, sizeToRelativeHeight } from "../measure";

export type PaddingProps = {
    height?: string;
    size?: Size;
};

export const Padding: FunctionComponent<PaddingProps> = ({
    height,
    size = "medium",
}) => {
    let finalHeight: string;

    if (height !== undefined) {
        finalHeight = height;
    } else {
        finalHeight = sizeToRelativeHeight(size);
    }

    return <div style={{ height: finalHeight }}></div>;
};

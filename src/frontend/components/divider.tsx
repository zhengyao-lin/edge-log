import React, { FunctionComponent } from "react";
import {
    Divider as SemanticDivider,
    DividerProps as SemanticDividerProps,
} from "semantic-ui-react";

export type DividerProps = {
    margin?: string;
} & SemanticDividerProps;

export const Divider: FunctionComponent<DividerProps> = ({
    margin = "0",
    ...props
}) => (
    <SemanticDivider
        style={{ marginTop: margin, marginBottom: margin }}
        {...props}
    ></SemanticDivider>
);

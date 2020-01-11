import { h, RenderableProps, VNode } from "preact";
import { measureToCSSProperty, Gap } from "./measures";
import { BaseProps, Base, InternalProperty, Div } from "./base";

export type DividerProps<P> = BaseProps<
    P,
    {
        size?: Gap;
    }
>;

export function Divider<P extends InternalProperty<"style">>(
    props: RenderableProps<DividerProps<P>>
): VNode {
    const sizeOptional: Gap | undefined = props.size;
    const size = sizeOptional || "gap-medium";

    return (
        <Base
            {...(Object.assign({ as: Div }, props) as any)}
            style={Object.assign(
                {
                    "margin-top": measureToCSSProperty([0.5, size]),
                    // a complete rip-off from semantic ui
                    "border-top": "1px solid rgba(34, 36, 38, 0.15)",
                    "border-bottom": "1px solid rgba(255, 255, 255, 0.1)",
                    "margin-bottom": measureToCSSProperty([0.5, size]),
                },
                props.style || {}
            )}
        >
            {props.children}
        </Base>
    );
}

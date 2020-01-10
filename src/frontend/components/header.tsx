import { h, RenderableProps, VNode } from "preact";
import { Height, measureToCSSProperty, Measure } from "./measures";
import { BaseProps, Base, InternalProperty } from "./base";

export type HeaderProps<P> = BaseProps<
    P,
    InternalProperty<"style"> & {
        size?: Height;
    }
>;

export function Header<P>(props: RenderableProps<HeaderProps<P>>): VNode {
    const size: Measure | undefined = props.size;

    return (
        <Base
            {...props}
            style={Object.assign(
                {
                    "font-weight": "bolder",
                    "font-size": measureToCSSProperty(size || "height-medium"),
                },
                props.style || {}
            )}
        >
            {props.children}
        </Base>
    );
}

import { h, RenderableProps, VNode } from "preact";
import { Height, measureToCSSProperty, Measure } from "./measures";
import { BaseProps, Base, InternalProperty, Div } from "./base";

export type HeaderProps<P> = BaseProps<
    P,
    {
        size?: Height;
    }
>;

/**
 * Header requires the host component to have a (possibly optional) `style` property
 */
export function Header<P extends InternalProperty<"style">>(
    props: RenderableProps<HeaderProps<P>>
): VNode {
    const size: Measure | undefined = props.size;

    return (
        <Base
            {...(Object.assign({ as: Div }, props) as any)}
            style={Object.assign(
                {
                    "font-weight": "bolder",
                    "font-size": measureToCSSProperty(size || "height-big"),
                },
                props.style || {}
            )}
        >
            {props.children}
        </Base>
    );
}

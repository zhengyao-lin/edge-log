import { h, RenderableProps, VNode } from "preact";
import { BaseProps, InternalProperty, Base } from "./base";
import { Width, measureToCSSProperty, Measure } from "./measures";
import { useMediaQuery } from "./media";

export type ContainerProps<P> = BaseProps<
    P,
    InternalProperty<"style"> & {
        maxWidth?: Width;
    }
>;

/**
 * Container is a component that adjust max-width
 * according to the screen size
 */
export function Container<P>(props: RenderableProps<ContainerProps<P>>): VNode {
    const maxWidth: Measure | undefined = props.maxWidth;

    return (
        <Base
            {...props}
            style={Object.assign(
                {
                    "max-width": measureToCSSProperty(maxWidth || "width-full"),
                },
                props.style || {}
            )}
        >
            {props.children}
        </Base>
    );
}

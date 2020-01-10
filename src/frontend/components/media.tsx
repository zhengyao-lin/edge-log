import { useCallback, useEffect, useRef } from "preact/hooks";

/**
 * Make conditional calls to the given callbacks when the
 * screen changes to fit/not fit the media query
 *
 * positiveAction and negativeAction should be idempotent
 */
export const useMediaQuery = (
    query: string,
    positiveAction: () => void,
    negativeAction: () => void
) => {
    const mediaQueryList = useRef(window.matchMedia(query));

    const handleChange = useCallback((event: MediaQueryListEvent) => {
        if (event.matches) {
            positiveAction();
        } else {
            negativeAction();
        }
    }, [query]);

    useEffect(() => {
        mediaQueryList.current.addListener(handleChange);
        return () => mediaQueryList.current.removeListener(handleChange);
    }, [query]);
};

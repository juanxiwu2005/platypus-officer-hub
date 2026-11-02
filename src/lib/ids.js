/**
 * The next number for an id made of a prefix and a counter, such as "report:3" or "extension-e1:x-2".
 * It is the list length, as before, unless some id already carries a counter that high, so deleting an item
 * later can never make a new id collide with one that is still in use.
 */
export const nextCounter = (ids, counterIn) => {
    let max = -1;
    for (const id of ids) {
        const m = counterIn.exec(id);
        if (m)
            max = Math.max(max, Number(m[1]));
    }
    return Math.max(ids.length, max + 1);
};

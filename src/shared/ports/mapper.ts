/**
 * Generic mapper interface that converts one type to another.
 *
 * @typeParam TSource - The source type being mapped *from*.
 * @typeParam TTarget - The target type being mapped *to*.
 */
export interface Mapper<TSource, TTarget> {
  /** Transform a source instance into a target instance. */
  map(source: TSource): TTarget;
}
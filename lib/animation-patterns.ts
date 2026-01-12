/**
 * Animation Utilities for Delete Operations
 * 
 * These animations provide smooth, professional transitions when items are deleted.
 * Apply them using Tailwind classes or create custom variants.
 */

/**
 * SMOOTH EXIT ANIMATION
 * Applied when an item is being deleted
 * 
 * Usage:
 * className={`transition-all duration-300 ${
 *   isRemoving ? 'opacity-0 scale-95 -translate-x-full' : 'opacity-100 scale-100 translate-x-0'
 * }`}
 */

/**
 * Animation Breakdown:
 * 
 * 1. opacity-0          - Fades the item out
 * 2. scale-95           - Slightly shrinks the item (95% of original size)
 * 3. -translate-x-full  - Slides the item completely to the left
 * 4. transition-all     - Animates all properties smoothly
 * 5. duration-300       - Takes 300ms to complete
 */

/**
 * TIMING COORDINATION
 * 
 * For best results, coordinate deletion with animation:
 * 
 * const handleDelete = async () => {
 *   setIsDeleting(true);
 *   setRemovingItemId(itemId);
 *   
 *   // Wait for animation to start (300ms)
 *   await new Promise(resolve => setTimeout(resolve, 300));
 *   
 *   // Perform deletion
 *   await deleteFromDatabase();
 *   
 *   // Wait for animation to complete (another 300ms)
 *   await new Promise(resolve => setTimeout(resolve, 300));
 *   
 *   // Clean up and refresh
 *   setRemovingItemId(null);
 *   refreshList();
 * };
 */

/**
 * ALTERNATIVE ANIMATIONS
 * 
 * You can customize these for different effects:
 */

// Fade only (no movement)
// className={`transition-opacity duration-300 ${isRemoving ? 'opacity-0' : 'opacity-100'}`}

// Fade + Scale (no slide)
// className={`transition-all duration-300 ${isRemoving ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}

// Fade + Slide Down
// className={`transition-all duration-300 ${isRemoving ? 'opacity-0 translate-y-full' : 'opacity-100 translate-y-0'}`}

// Fade + Slide Right
// className={`transition-all duration-300 ${isRemoving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}

// Fade + Rotate
// className={`transition-all duration-300 ${isRemoving ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}

/**
 * MODAL ANIMATIONS
 * 
 * The modal uses these animations automatically:
 * 
 * Background: animate-in fade-in duration-200
 * Content:    animate-in zoom-in-95 duration-200
 * 
 * These are provided by Tailwind's animation utilities
 */

/**
 * PERFORMANCE TIPS
 * 
 * 1. Use transform properties (translate, scale, rotate) - they're GPU accelerated
 * 2. Avoid animating width/height - use scale instead
 * 3. Keep durations between 200-400ms for best feel
 * 4. Use ease-in-out (Tailwind default) for smooth motion
 */

/**
 * ACCESSIBILITY
 * 
 * Consider users with motion sensitivity:
 * 
 * @media (prefers-reduced-motion: reduce) {
 *   .animated-element {
 *     animation: none;
 *     transition: none;
 *   }
 * }
 * 
 * Or in Tailwind:
 * className="motion-reduce:transition-none motion-reduce:animate-none"
 */

export {};

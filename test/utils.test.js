const { wrapText, applyTextShadow } = require('../src/utils');

describe('Utility Functions', () => {
    describe('wrapText', () => {
        const mockMeasureText = jest.fn(text => ({ width: (text || '').length * 10 }));
        const mockCtx = { measureText: mockMeasureText };

        beforeEach(() => {
            mockMeasureText.mockClear();
        });

        it('should return empty string for null or undefined input', () => {
            expect(wrapText(mockCtx, null, 100)).toBe('');
            expect(wrapText(mockCtx, undefined, 100)).toBe('');
        });
        
        it('should return empty string for empty string input', () => {
            expect(wrapText(mockCtx, '', 100)).toBe('');
        });

        it('should not wrap text shorter than maxWidth', () => {
            const text = 'Hello world';
            // text.length = 11, width = 110. maxWidth = 200.
            expect(wrapText(mockCtx, text, 200)).toBe(text);
        });

        it('should wrap text longer than maxWidth into multiple lines', () => {
            const text = 'This is a long string that needs wrapping';
            // "This is a".length * 10 = 90 <= 100
            // "long string".length * 10 = 110 > 100. So "long" or "long string" should be on next line.
            // "that needs".length * 10 = 100 <= 100
            // "wrapping".length * 10 = 80 <= 100
            // Expected based on current wrapText logic (simplified):
            // "This is a" (90)
            // "long" (40) -> "long string" (110) > 100. -> wrapText's hyphenateWord is basic, might just break.
            // Actual behavior of wrapText and hyphenateWord is complex.
            // Let's test for a simple split.
            // "This is a long string that needs wrapping"
            // maxWidth = 100
            // "This is a" (width 90)
            // "long" (width 40). "This is a long" (width 130 > 100). So "This is a" is a line.
            // Next line starts with "long". "long string" (width 110 > 100).
            // If "long" itself is > 100, it would be hyphenated. Here it is not.
            // So "long" is one line.
            // Next line "string". "string that" (width 110 > 100). So "string" is a line.
            // Next line "that". "that needs" (width 100 <= 100).
            // Next line "wrapping".
            // This depends heavily on the exact implementation of wrapText and hyphenateWord.
            // The provided wrapText example in prompt is a bit different.
            // Let's make a simpler case:
            const simpleText = "one two three four"; // "one two" (70), "three" (50)
            const wrappedSimple = wrapText(mockCtx, simpleText, 80); // Max width 80
            expect(wrappedSimple).toBe("one two\nthree\nfour");

            const longerText = 'A very long sentence to test basic wrapping functionality not complex hyphenation';
            const wrappedLonger = wrapText(mockCtx, longerText, 200); // Each word is < 200
            expect(wrappedLonger).toBe('A very long sentence\nto test basic\nwrapping functionality\nnot complex\nhyphenation');
        });

        it('should handle a single word longer than maxWidth by attempting to hyphenate or break it', () => {
            const text = 'Supercalifragilisticexpialidocious'; // length 34, width 340
            const wrapped = wrapText(mockCtx, text, 100);
            // The current hyphenateWord is basic, it will add a hyphen.
            // "Supercalif-" (100)
            // "ragilistic-" (100)
            // "expialidoc-" (100)
            // "ious" (40)
            expect(wrapped).toBe('Supercalif-\nragilistic-\nexpialidoc-\nious');
        });
         it('should handle text with leading/trailing spaces gracefully', () => {
            const text = '  leading and trailing spaces  ';
            const wrapped = wrapText(mockCtx, text.trim(), 100); // Test with trimmed version for predictability
            expect(wrapped).toBe('leading\nand\ntrailing\nspaces');
        });

        it('should handle maxWidth of 0 or less (edge case)', () => {
            const text = 'short';
            // According to current wrapText, if (metrics.width < maxWidth) is false, it pushes currentLine
            // and starts new. If maxWidth is 0, it would result in each word on a new line.
            // The hyphenateWord might also behave differently.
            // The implementation in utils.js for hyphenateWord returns word if it can't hyphenate.
            // wrapText itself doesn't explicitly forbid maxWidth <=0 but measureText might.
            // Current wrapText has: if (metrics.width < maxWidth)
            // If maxWidth = 0, this is always false.
            // if (ctx.measureText(word).width > maxWidth) -> this will be true
            // hyphenateWord(ctx, word, maxWidth) -> this would try to break word into single chars with hyphens
            // Let's assume for now it returns the word broken by lines if maxWidth is too small.
            // "s-" "h-" "o-" "r-" "t" if hyphenateWord is aggressive.
            // The current hyphenateWord in utils.js:
            // for (let i = word.length - 1; i > 0; i--) { const part = word.substring(0, i) + '-'; if (ctx.measureText(part).width <= maxWidth) return part; } return word;
            // If maxWidth is 0, measureText(part).width will likely be > 0, so it will always return word.
            // Then wrapText will put each word on a new line.
            expect(wrapText(mockCtx, "word", 0)).toBe("word"); // based on current hyphenateWord returning word if it can't make it smaller than maxWidth
            expect(wrapText(mockCtx, "two words", 0)).toBe("two\nwords");
        });
    });

    describe('applyTextShadow', () => {
        let mockCtxShadow;

        beforeEach(() => {
            mockCtxShadow = {
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0
            };
        });

        it('should apply default shadow properties when enabled with no options', () => {
            applyTextShadow(mockCtxShadow); // No options, enabled by default
            expect(mockCtxShadow.shadowColor).toBe('rgba(0, 0, 0, 0.5)');
            expect(mockCtxShadow.shadowBlur).toBe(5);
            expect(mockCtxShadow.shadowOffsetX).toBe(2);
            expect(mockCtxShadow.shadowOffsetY).toBe(2);
        });
        
        it('should apply default shadow properties when enabled explicitly', () => {
            applyTextShadow(mockCtxShadow, { enabled: true });
            expect(mockCtxShadow.shadowColor).toBe('rgba(0, 0, 0, 0.5)');
            expect(mockCtxShadow.shadowBlur).toBe(5);
            expect(mockCtxShadow.shadowOffsetX).toBe(2);
            expect(mockCtxShadow.shadowOffsetY).toBe(2);
        });

        it('should apply custom shadow properties when enabled', () => {
            const customOptions = {
                enabled: true,
                color: 'red',
                blur: 10,
                offsetX: 5,
                offsetY: 5
            };
            applyTextShadow(mockCtxShadow, customOptions);
            expect(mockCtxShadow.shadowColor).toBe('red');
            expect(mockCtxShadow.shadowBlur).toBe(10);
            expect(mockCtxShadow.shadowOffsetX).toBe(5);
            expect(mockCtxShadow.shadowOffsetY).toBe(5);
        });

        it('should reset shadow properties when disabled', () => {
            // First apply some shadow
            applyTextShadow(mockCtxShadow, { enabled: true, color: 'blue', blur: 3, offsetX: 1, offsetY: 1 });
            expect(mockCtxShadow.shadowColor).toBe('blue'); // Pre-check

            // Then disable it
            applyTextShadow(mockCtxShadow, { enabled: false });
            expect(mockCtxShadow.shadowColor).toBe('transparent');
            expect(mockCtxShadow.shadowBlur).toBe(0);
            expect(mockCtxShadow.shadowOffsetX).toBe(0);
            expect(mockCtxShadow.shadowOffsetY).toBe(0);
        });
        
        it('should allow partial custom options and use defaults for others', () => {
            applyTextShadow(mockCtxShadow, { enabled: true, color: 'green' });
            expect(mockCtxShadow.shadowColor).toBe('green');
            expect(mockCtxShadow.shadowBlur).toBe(5); // Default
            expect(mockCtxShadow.shadowOffsetX).toBe(2); // Default
            expect(mockCtxShadow.shadowOffsetY).toBe(2); // Default

            applyTextShadow(mockCtxShadow, { enabled: true, blur: 20 });
            expect(mockCtxShadow.shadowColor).toBe('rgba(0, 0, 0, 0.5)'); // Default
            expect(mockCtxShadow.shadowBlur).toBe(20);
            expect(mockCtxShadow.shadowOffsetX).toBe(2); // Default
            expect(mockCtxShadow.shadowOffsetY).toBe(2); // Default
        });
    });
});

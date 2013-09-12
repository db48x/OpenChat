describe("the Collection class",
         function () {
             var c;

             beforeEach(function () {
                 spyOn(window, 'Collection').andCallThrough();
                 c = new Collection();
             });

             it("should not throw in the constructor",
                function () {
                    expect(c).toBeTruthy();
                    expect(Collection).toHaveBeenCalled();
                    expect(Collection).not.toThrow();
                });

             it("should remember things that are added",
                function () {
                    c.add("foo", 42);
                    expect(c.item("foo")).toBe(42);
                });

             it("should forget things that are removed",
                function () {
                    c.add("foo", 42);
                    c.remove("foo");
                    expect(c.item("foo")).toBe(undefined);
                });
         });

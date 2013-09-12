describe("the Collection class",
         function () {
             beforeEach(function () {
                 spyOn(window, 'Collection').andCallThrough();
             });

             it("should not throw in the constructor",
                function () {
                    var c = new Collection();
                    expect(c).toBeTruthy();
                    expect(Collection).toHaveBeenCalled();
                    expect(Collection).not.toThrow();
                });
         });

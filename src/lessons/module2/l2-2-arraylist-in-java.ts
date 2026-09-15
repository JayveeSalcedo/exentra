import type { Lesson } from '../types'

const lesson: Lesson = {
  id: 'l2-2',
  moduleId: '2',
  title: 'ArrayList in Java',
  summary: 'Use Java’s ArrayList to create dynamic arrays — add, change, remove and iterate elements.',
  unitOutcomes: [
    'Understand and implement ArrayList in place of Array',
    'Perform fundamental ArrayList operations',
    'Enumerate the features and internal operations of ArrayList',
    'Use common ArrayList methods',
  ],
  reading: [
    { type: 'paragraph', text: 'Although arrays bring advantages over the usual single-valued variables, they also have limitations that keep us from performing several list operations without compromising the time complexity of the algorithm. In this unit, we introduce a specialized class that allows us to create dynamic arrays: the ArrayList.' },
    { type: 'heading', text: 'Basic Concept of ArrayList and its Operations' },
    { type: 'list', items: [
      'ArrayList is a part of the collection framework and is present in the java.util package.',
      'It provides us with dynamic arrays in Java.',
    ] },
    { type: 'code', caption: 'Code Demonstration 1 – working of ArrayList', code: `import java.io.*;
import java.util.*;

public class ArrayListExample {
  public static void main(String[] args) {
    // Size of the ArrayList
    int n = 5;

    // Declaring the ArrayList with initial size n
    ArrayList<Integer> arrli = new ArrayList<Integer>(n);

    // Appending new elements at the end of the list
    for (int i = 1; i <= n; i++)
      arrli.add(i);

    // Printing elements
    System.out.println(arrli);

    // Remove element at index 3
    arrli.remove(3);

    // Displaying the ArrayList after deletion
    System.out.println(arrli);

    // Printing elements one by one
    for (int i = 0; i < arrli.size(); i++)
      System.out.print(arrli.get(i) + " ");
  }
}

// Output:
// [1, 2, 3, 4, 5]
// [1, 2, 3, 5]
// 1 2 3 5` },
    { type: 'list', items: [
      'You need to import java.util to use the ArrayList class and its functions.',
      'Initially, a size for the ArrayList was set using the variable n whose value is 5.',
      'ArrayList<Integer> arrli = new ArrayList<Integer>(n) creates an object of the ArrayList class, used to access the ArrayList operations.',
      'The demonstration adds elements, removes an element and fetches each element.',
    ] },
    { type: 'heading', text: 'Basic Operations in ArrayList' },
    { type: 'paragraph', text: 'Adding Elements: use the add() method. It is overloaded: add(Object) adds an element at the end of the ArrayList; add(int index, Object) adds an element at a specific index.' },
    { type: 'code', caption: 'Code Demonstration 2 – adding elements', code: `ArrayList<String> al = new ArrayList<>();

al.add("Geeks");
al.add("Geeks");
al.add(1, "For");

System.out.println(al);   // [Geeks, For, Geeks]` },
    { type: 'paragraph', text: 'Changing Elements: use the set() method. Since an ArrayList is indexed, the element to change is referenced by its index, so set() takes an index and the updated element.' },
    { type: 'code', caption: 'Code Demonstration 3 – changing elements', code: `ArrayList<String> al = new ArrayList<>();

al.add("Geeks");
al.add("Geeks");
al.add(1, "Geeks");
System.out.println("Initial ArrayList " + al);  // [Geeks, Geeks, Geeks]

al.set(1, "For");
System.out.println("Updated ArrayList " + al);  // [Geeks, For, Geeks]` },
    { type: 'paragraph', text: 'Removing Elements: use the remove() method. remove(Object) removes the first occurrence of the object; remove(int index) removes the element at that index, after which all following elements move left and their indices are updated.' },
    { type: 'code', caption: 'Code Demonstration 4 – removing elements', code: `ArrayList<String> al = new ArrayList<>();

al.add("Geeks");
al.add("Geeks");
al.add(1, "For");
System.out.println("Initial ArrayList " + al);        // [Geeks, For, Geeks]

al.remove(1);
System.out.println("After the Index Removal " + al);  // [Geeks, Geeks]

al.remove("Geeks");
System.out.println("After the Object Removal " + al); // [Geeks]` },
    { type: 'paragraph', text: 'Iterating the ArrayList: the most common ways are the basic for loop combined with get(), and the advanced (for-each) loop.' },
    { type: 'code', caption: 'Code Demonstration 5 – iterating', code: `// Using the get method and the for loop
for (int i = 0; i < al.size(); i++) {
  System.out.print(al.get(i) + " ");
}
System.out.println();

// Using the for-each loop
for (String str : al)
  System.out.print(str + " ");

// Output:
// Geeks For Geeks
// Geeks For Geeks` },
    { type: 'heading', text: 'Features and Internal Operations of ArrayList' },
    { type: 'list', items: [
      'ArrayList inherits the AbstractList class and implements the List interface.',
      'ArrayList is initialized by a size, but the size increases automatically if the collection grows, or shrinks if objects are removed.',
      'Java ArrayList allows us to randomly access the list.',
      'ArrayList cannot be used for primitive types like int or char — we need a wrapper class (e.g. Integer).',
      'ArrayList in Java can be seen as a vector in C++.',
      'ArrayList is not synchronized. Its equivalent synchronized class in Java is Vector.',
    ] },
    { type: 'paragraph', text: 'How does ArrayList work internally? Since it is a dynamic array, its size increases automatically as we add items. When the array becomes full and we try to add an item, the basic idea is:' },
    { type: 'list', ordered: true, items: [
      'Create a bigger memory block on the heap (for example, double the size).',
      'Copy the current elements to the new memory.',
      'Add the new item, since there is now more room.',
      'Delete the old memory.',
    ] },
    { type: 'heading', text: 'Other Methods for Java ArrayList' },
    { type: 'table', headers: ['Method', 'Description'], rows: [
      ['add(int index, Object element)', 'Inserts a specific element at a specific position index in a list.'],
      ['add(Object o)', 'Appends a specific element to the end of a list.'],
      ['addAll(Collection C)', 'Appends all the elements from a specific collection to the end of the list, in the order returned by the collection’s iterator.'],
      ['addAll(int index, Collection C)', 'Inserts all the elements of a collection starting at the specified position.'],
      ['clear()', 'Removes all the elements from the list.'],
      ['clone()', 'Returns a shallow copy of an ArrayList.'],
      ['contains(Object o)', 'Returns true if this list contains the specified element.'],
      ['ensureCapacity(int minCapacity)', 'Increases the capacity, if necessary, to hold at least minCapacity elements.'],
      ['forEach(Consumer action)', 'Performs the given action for each element until all are processed or the action throws an exception.'],
      ['get(int index)', 'Returns the element at the specified position in this list.'],
      ['indexOf(Object O)', 'Returns the index of the first occurrence of the element, or -1 if not in the list.'],
      ['isEmpty()', 'Returns true if this list contains no elements.'],
      ['lastIndexOf(Object O)', 'Returns the index of the last occurrence of the element, or -1 if not in the list.'],
      ['listIterator() / listIterator(int index)', 'Returns a list iterator over the elements (optionally starting at the specified position).'],
      ['remove(int index)', 'Removes the element at the specified position.'],
      ['remove(Object o)', 'Removes the first occurrence of the specified element, if present.'],
      ['removeAll(Collection c)', 'Removes all elements contained in the specified collection.'],
      ['removeIf(Predicate filter)', 'Removes all elements that satisfy the given predicate.'],
      ['removeRange(int fromIndex, int toIndex)', 'Removes elements whose index is between fromIndex (inclusive) and toIndex (exclusive).'],
      ['retainAll(Collection c)', 'Retains only the elements contained in the specified collection.'],
      ['set(int index, E element)', 'Replaces the element at the specified position.'],
      ['size()', 'Returns the number of elements in this list.'],
      ['subList(int fromIndex, int toIndex)', 'Returns a view of the portion between fromIndex (inclusive) and toIndex (exclusive).'],
      ['toArray()', 'Returns an array containing all elements in the correct order.'],
      ['trimToSize()', 'Trims the capacity of the ArrayList to the list’s current size.'],
    ] },
  ],
  keyPoints: [
    'ArrayList (java.util) is a dynamic array that grows and shrinks automatically.',
    'add(x) appends; add(i, x) inserts at an index.',
    'set(i, x) changes an element; remove(i) or remove(obj) deletes one.',
    'get(i) and size() let you loop through the list; a for-each loop also works.',
    'Use wrapper classes like Integer — ArrayList cannot hold primitive types.',
  ],
  exercises: [
    'Identify the following:\n1. A function that fetches items from an array list based on a specific index.\n2. ArrayList class can be found in the ______ package.\n3. Changing an item inside an array list can be done using the ______ function.\n4. When adding an item at a specific index, you need __ parameters for the add function.\n5. ArrayList in Java can be compared to ______ in C++.\n6. Compared to the conventional array, ArrayList allows you to create a ______ array.\n7. The size() function returns the ______ of elements in an ArrayList.\n8. The ______ function allows you to delete an element from an ArrayList.\n9. Allows you to check whether or not the ArrayList contains elements.\n10. Instead of primitive types, ArrayList can be used along with ______ classes.',
    'Laboratory Exercise:\n1. Create a new array list, add some colours (string) and print out the collection.\n2. Insert an element into the array list at the first position.\n3. Update a specific array element by a given element.\n4. Search for an element in an array list.\n5. Join two array lists.',
    'Laboratory Activity – Prompt the user for an integer, then ask the user to enter that many values. Store them in an array and print it. Then reverse the elements in place (swap elements — do not create a second array) and print the array again.',
  ],
  durationMinutes: 30,
  source: { guide: 2, pages: '4–14' },
  visualizerType: 'array',
  starterCode: `import java.util.*;

public class Main {
  public static void main(String[] args) {
    // 1. Create an array list of colours and print it
    ArrayList<String> colours = new ArrayList<>();

    // 2. Insert "White" at the first position

    // 3. Update the element at index 2 to "Yellow"

    // 4. Search for "Blue"

    // 5. Join another list to this one
  }
}`,
  expectedOutput: `[Red, Green, Blue, Orange]
[White, Red, Green, Blue, Orange]
[White, Red, Yellow, Blue, Orange]
Blue found: true
[White, Red, Yellow, Blue, Orange, Black, Pink]`,
  challenge: {
    prompt: 'Laboratory Exercise: create a colours list, insert at the first position, update an element, search for one, and join two lists.',
    checks: [
      { id: 'import', label: 'Imports java.util', test: code => /import\s+java\.util/.test(code) },
      { id: 'add', label: 'Adds colours with add()', test: code => /\.add\s*\(\s*"/.test(code) },
      { id: 'insert-first', label: 'Inserts at index 0 with add(0, …)', test: code => /\.add\s*\(\s*0\s*,/.test(code) },
      { id: 'set', label: 'Updates an element with set()', test: code => /\.set\s*\(/.test(code) },
      { id: 'search', label: 'Searches with contains() or indexOf()', test: code => /\.(contains|indexOf)\s*\(/.test(code) },
      { id: 'join', label: 'Joins two lists with addAll()', test: code => /\.addAll\s*\(/.test(code) },
    ],
  },
  hints: [
    'colours.add(0, "White") shifts every element one place to the right.',
    'contains("Blue") returns a boolean; indexOf("Blue") returns -1 if missing.',
    'Create a second ArrayList and call colours.addAll(second).',
  ],
  complexityNote: 'get/set O(1) · add at end O(1) amortized · add/remove at index O(n)',
}

export default lesson

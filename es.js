function Todo(description) {
  this.description = description;

  this.print = () => {
    console.log(this.description);
  };
}

class ClassTodo {
  constructor(description) {
    this.description = description;
  }

  print = () => {
    console.log(this.description);
  };
}

const todo1 = new Todo("first todo");
todo1.print();

const todo2 = new ClassTodo("second todo");
todo2.print();

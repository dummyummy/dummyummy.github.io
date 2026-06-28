---
title: Cpp Concurrency in Action笔记
tags:
  - Concurrency
  - 并发编程
categories:
  - C++
  - 学习笔记
date: 2026-06-28 18:41:58
---


# Chapter 1: Hello, world of concurrency in C++!

# Chapter 2: Managing threads

# Chapter 3: Sharing data between threads

## Mutex

- 虽然std::mutex提供了`lock/try_lock/unlock`，但是在实际使用时还是尽可能使用std::lock_guard，利用RAII来完成加锁和解锁。std::lock_guard在C++ 17还有一个升级版本叫std::scoped_lock。

- 竞态条件完全不是直接上锁就能避免的，还需遵从如下的几个原则。也就是说，必须严格把对于被mutex保护的内存的访问局限在同于个critical section，一点也不能泄露出去，因此在**接口的设计**上必须特别小心。

  ```
  Don’t pass pointers and references to protected data outside the scope of the lock, whether by returning them from a function, storing them in externally visible memory, or passing them as arguments to user-supplied functions.
  ```

## 线程安全的Stack

以std::stack提供的功能为例，它提供了独立的`empty/top/pop`接口。这样做在单线程环境下是没有问题的，但是到了多线程环境下，任何的empty和top，以及top和pop之间都可能会有其他的栈操作。比如线程AB都先使用top得到栈顶的值，然后分别pop，结果就是栈顶下面的值在被读取之前就被pop了，显然不行。书中也提到了，这种设计的出发点是防止拷贝时因为内存不足抛出exception导致栈顶的值被丢弃，但是它在多线程环境下反而成了阻碍。

为了让stack能够在并发环境下工作，首先要对这三个接口进行一定程度上的合并。如果允许top和pop在栈空时抛出异常，那么empty基本就可以省略了。另外top和pop必须进行合并，为了能够正常出栈，需要把top删除，仅保留pop。所以，一个线程安全的栈仅具有pop和一个empty接口，保留empty接口是为了方便使用。

pop接口的设计也值得斟酌。避免bad_alloc导致操作不完整的最简单方式就是要求调用者预先在外界做好分配并传入引用，但是这种方法的局限性很大，比如某些情况下调用者无从得知要预留多大的空间。如果栈中元素类型有noexcept的拷贝或移动构造的话，说明bad_alloc根本不会出现，方法可以放心地返回一个值。另外容易看出，如果能在出栈之前就预留空间，这样即便有bad_alloc也不会造成操作不完整，因此还可以在pop内部分配一块动态内存用于缓存栈顶的值，然后将指针作为返回值。

书中给出的设计提供了传引用和返回指针两种接口，pop在栈为空时会抛出异常。

### 为什么push接口要选用按值传递

在并发环境下，我们希望critical section能够尽可能地小，因此要保证耗时操作尽可能地在未上锁时进行。如果不是按值传递而是使用左值常引用的话，接口看起来会是下面的样子，导致拷贝在上锁后才发生。而使用按值传递的话，拷贝在push开始执行前就完成了。

```cpp
    void push(const T &new_value)
    {
        std::lock_guard<std::mutex> lock(m);
        data.push(new_value); // copy作为耗时操作被留在了critical section内
    }
```

## 死锁

避免死锁的几条通用方针：

1. 避免嵌套加锁，尽量不要在持有锁的情况下继续尝试上锁，如果不可避免的话就使用std::lock。
2. 尽量避免在持有锁时调用用户代码，除非确定整条调用链都不会再额外加锁。
3. 按照各线程统一的顺序去获取锁。本规则是第一条的下位，如果能一次性上锁就优先用规则一。
4. 将锁划分到不同的层级，示例代码见原书，值得注意的地方就是使用thread_local的变量保留当前线程的优先级。

thread的join也有可能导致死锁，因此最好不要在持有锁时启动线程，这一点要注意。

## std::unique_lock

std::unique_lock在mutex上做了一层封装，支持defer_lock模式，通过维护一个额外的标志位换取更大的灵活性，可以随时判断现在是否持有锁而非使用try_lock。如果不是必须要利用这一点，用std::scoped_lock或是std::lock_guard就够了。

std::unique_lock的典型应用场景就是哪些需要在中途解锁的场景，比如搭配下一章的conditional variable使用，在线程进入睡眠之前先行解锁。

## 唯一初始化

- 可以使用std::once_flag搭配std::call_once来保证某个初始化函数只被任何一个线程调用一次，相比使用mutex的额外开销要小很多。如果是C++11及以上的话，标准保证了局部静态变量只会进行唯一的初始化，其他线程在初始化完成之前都会被阻塞。

## 为低频更新加速

当writer仅有一个但reader有多个时，可以考虑使用reader-writer mutex，C++17提供了std::shared_mutex和std::shared_timed_mutex。std::shared_timed_mutex额外支持一些时间相关的操作。writer通过std::unique_lock\<std::shared_mutex\>或std::lock_guard\<std::shared_mutex\>来加锁，而reader则通过std::shared_lock\<std::shared_mutex\>来加锁。一旦有writer加锁，所有的reader都会被block，而一旦还有reader持有锁，则writer想要独占锁就会被阻塞。

## Reentrant lock可重入锁

C++通过std::recursive_mutex提供了可重入锁，可以多次加锁，但是必须有相应次数的解锁。书中提到，为了设计上的直观，尽量不要使用可重入锁。

# Chapter 4: Synchronizing concurrent operations

第四章主要内容为C++中实现响应式并发的基础设施。

# Miscellaneous

## RVO和NRVO

当函数返回一个左值(NRVO)或者是右值(RVO)时，如果接收者是一个constructor，编译器首先会尝试进行就地构造，直接在接收者的内存地址上调用构造函数，相当于函数内部和外部一共就只调用了一次构造函数。如果就地构造失败的话，比如多个返回路径的情况，编译器则会尝试做一次Implicit Move，将返回值转换为右值，这样如果接收者有移动构造函数的话就调用，否则就fallback到拷贝构造函数上。

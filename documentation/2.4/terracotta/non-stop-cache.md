---
---
# NonStop Operation

 

## Introduction
The `nonstop` mode provides resiliency in the event that a cache gets disconnected from an L2. It can be used in conjunction with &lt;rejoin>.

Use cases include:

* Set timeouts on cache operations. For example, say you use the cache rather than a mainframe. The SLA calls for 3 seconds.
 There is a temporary network interruption which stops Terracotta responding to a cache request. With the timeout
 you can return after 3 seconds. The lookup is then done against the mainframe. This could also be useful for
 write-through, writes to disk or synchronous writes.
* Automatically respond to cluster topology events to take a pre-configured action.
* Allowing Availability over Consistency within the CAP theorem when a network partition occurs.
* Providing graceful degradation to user applications when Distributed Cache becomes unavailable.

## Configuration
The &lt;terracotta> sub-element has a &lt;nonstop> sub-element to allow configuration of cache behaviour if a distributed
  cache operation cannot be completed within a set time or in the event of a clusterOffline message.
It has the following optional attributes:

*  enabled="true|false" - defaults to false.
*  timeoutMillis -   the number of milliseconds before a cache operation times out. The default value is 30,000 ms (30 seconds).
*  immediateTimeout="true|false" - What to do on receipt of a ClusterOffline event indicating that communications
 with the Terracotta Server Array were interrupted. The default is false.
&lt;nonstop> has a sub-element, &lt;timeoutBehavior>, which has a single attribute to control the behavior of the cache when a nonstop timeout occurs:
*  type="exception | noop | localReads" - What to do when a timeout has occurred. The default is exception.

### Minimal config:

    <cache name="myCache" maxElementsInMemory="10000" eternal="false"
       overflowToDisk="false">
      <terracotta>
        <nonstop immediateTimeout="false" timeoutMillis="30000">
          <timeoutBehavior type="noop" />
        </nonstop>
      </terracotta>
    </cache>

<!--
## How it knows about Terracotta Cluster Events
Behind the scenes, the TerracottaAwareCache constructor looks up the Terracotta cluster and registers a `ClusterTopologyListener` which calls back on certain cluster events.

    CacheCluster cacheCluster = cacheManager.getCluster(ClusterScheme.TERRACOTTA);
    cacheCluster.addTopologyListener(yourListener);

In particular it is interested in the `clusterOffline` and `clusterOnline` events.
-->

## Configuration Options in Detail

### Timeout Configuration

#### Setting Timeouts
Set the `timeoutMillis` property. It applies to all cache operations (put, get, remove ...). After the time elapses the operation is aborted. For mutate
operations (put, remove etc), it cannot be guaranteed whether the operation succeeded or not when the timeout happened.
What happens on timeout depends on the value of `timeoutBehavior`, which can take the following values:

* `noop`        - gets return null. Mutating operations such as put and removed are ignored.
* `exception`   - An unchecked exception, `NonStopCacheException`, which is a subtype of `CacheException` will be thrown.
* `localReads`   - currently Terracotta only. Returns data if held locally in memory in response to gets. Mutating operations such as put and removed are ignored.

NOTE: `localReads` behavior works only with `Cache` instances which are clustered using Terracotta. One obvious disadvantage is that it cannot be used to
decorate unclustered Cache's. Another not so obvious disadvantage is that `localReads` cannot be used when decorating other already decorated Caches
like `UnlockedReadsView`

#### ThreadPool Management
The timeout feature uses a SEDA style approach which utilises an Executor thread pool. By default one NonStopCache is associated with one Executor thread pool
(NonStopCacheExecutorService). The default NonStopCacheExecutorService has 10 threads, allowing 10 concurrent cache operations.
Different NonStopCache's can use the same Executor thread pool if desired. It can be achieved by using the NonStopCache constructor that accepts the
NonStopCacheExecutorService. You can specify your own thread pool size for each NonStopCacheExecutorService using the constructor that accepts `threadPoolSize`.
The thread pool is shut down when the associated NonStopCache (or all of them, if multiple NonStopCache uses the same NonStopCacheExecutorService) is disposed.

### Action on ClusterOffline Configuration
The clusterOfflineEvent is thrown when the socket between the client and server is closed. Note that there is no way
the cache has of knowing whether the interruption is transitory or permanent. For that reason it is recommended that it be
used in conjunction with `timeoutMillis` so that short interruptions do not trigger this.
In this version the only action which may be configured is `immediateTimeout`.
If immediateTimeout is true, then cache operations will immediately timeout after a clusterOffline event has been received.

#### immediateTimeout
The property `immediateTimeout` if set to true will cause the cache operations to act as if they have immediately timed out,
without waiting the `timeoutMillis` value.
What then happens depends on how `timeoutBehavior` is configured.

#### timeoutMillis
Remember that if an L2 goes away you will get a clusterOffline event after the `li.l2reconnect.timeout.millis` expires. This is based on heartbeating
between the L1-L2. This is essentially a network ping test. So timeoutMillis is meant to cover
situations up to that timeout. Setting it higher than the reconnect timeout has no effect, because a clusterOffline event will be received before the timemoutMillis
takes effect.

The general guide is SLA. If your SLA is a 5 second response, set this to 5 seconds. Then if a cache operation fails you will get an exception
which gives you the possiblity to then call the SLA. You can catch the
On the flip side what is the effect in your application on requests backing up. Before NIO application servers would allocate one thread per request.
The danger was that you could get an OutOfMemoryError if requests backed up.
In modern application servers there is a threadpool used to service requests. So the consequences of a back up are less dramatic.

Some causes of timeouts are:

* Full GC events
* Contention in the persistency layer in the Terracotta server
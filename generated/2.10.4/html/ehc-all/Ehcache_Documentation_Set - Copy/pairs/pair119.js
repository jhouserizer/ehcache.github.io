var pairs =
{
"disk":{"store":1}
,"store":{"eviction":1,"uses":1,"full":1}
,"eviction":{"algorithm":1}
,"algorithm":{"disk":1,"evict":1}
,"uses":{"least":1}
,"least":{"frequently":1}
,"frequently":{"used":1}
,"used":{"algorithm":1}
,"evict":{"element":1}
,"element":{"store":1}
}
;Search.control.loadWordPairs(pairs);
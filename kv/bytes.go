package kv

func ConcatBytes(arrays ...[]byte) []byte {
	var length int
	for _, array := range arrays {
		length += len(array)
	}

	concat := make([]byte, length)
	var offset int
	for _, array := range arrays {
		copy(concat[offset:], array)
		offset += len(array)
	}
	return concat
}

func SplitBytes(bytes []byte, separator []byte) [][]byte {
	var tuples [][]byte
	var offset int
	for {
		index := IndexOf(bytes[offset:], separator)
		if index == -1 {
			tuples = append(tuples, bytes[offset:])
			break
		}
		tuples = append(tuples, bytes[offset:offset+index])
		offset += index + len(separator)
	}
	return tuples
}

func IndexOf(bytes []byte, separator []byte) int {
	for i := 0; i < len(bytes); i++ {
		if bytes[i] == separator[0] {
			var found = true
			for j := 1; j < len(separator); j++ {
				if bytes[i+j] != separator[j] {
					found = false
					break
				}
			}
			if found {
				return i
			}
		}
	}
	return -1
}

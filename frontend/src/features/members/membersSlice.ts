import { createSlice } from '@reduxjs/toolkit'
import sampleData from '../../data/sample-data.json'
import type { Member } from '../expenses/expenseTypes'

const initialState: Member[] = sampleData.members

const membersSlice = createSlice({
  name: 'members',
  initialState,
  reducers: {},
})

export default membersSlice.reducer

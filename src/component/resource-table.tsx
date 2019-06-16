import React from 'react'
import Table from 'ink-table'

export function ResourceTable(props: {data: any[]}) {
  return <Table data={props.data}></Table>
}

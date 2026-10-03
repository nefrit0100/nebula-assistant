export default function ConversationLoading() {
  return (
    <div className="flex h-full flex-col" role="status" aria-label="Loading conversation">
      <div className="flex h-14 shrink-0 items-center px-4">
        <div className="skeleton h-4 w-48" />
      </div>
      <div className="mx-auto flex w-full max-w-[47rem] flex-1 flex-col gap-10 px-4 pt-8 sm:px-6">
        <div className="skeleton ml-auto h-11 w-2/5 rounded-[20px]" />
        <div className="flex flex-col gap-2.5">
          <div className="skeleton h-3.5 w-11/12" />
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-4/5" />
          <div className="skeleton h-3.5 w-3/5" />
        </div>
        <div className="skeleton ml-auto h-11 w-1/3 rounded-[20px]" />
        <div className="flex flex-col gap-2.5">
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-9/12" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[47rem] px-3 pb-4 sm:px-6">
        <div className="skeleton h-[104px] rounded-2xl" />
      </div>
    </div>
  )
}
